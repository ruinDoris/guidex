/*
 *  Copyright (c) 2017 Red Hat, Inc. and/or its affiliates.
 *  Copyright (c) 2017 INSA Lyon, CITI Laboratory.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// tag::generate-uuid[]
// Adapted from https://stackoverflow.com/a/8809472/2133695
function generateUUID() {
  var d = new Date().getTime();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
// end::generate-uuid[]

angular.module("wikiApp", [])
  .controller("WikiController", ["$scope", "$http", "$timeout", function ($scope, $http, $timeout) {

    var DEFAULT_PAGENAME = "Example page";
    var DEFAULT_MARKDOWN = "# Example page\n\nSome text _here_.\n";

    $scope.newPage = function () {
      $scope.pageId = undefined;
      $scope.pageName = DEFAULT_PAGENAME;
      $scope.pageMarkdown = DEFAULT_MARKDOWN;
    };

    $scope.reload = function () {
      $http.get("/api/pages").then(function (response) {
        $scope.pages = response.data.pages;
      });
    };

    $scope.pageExists = function() {
      return $scope.pageId !== undefined;
    };

    // tag::page-load[]
    $scope.load = function (id) {
      $scope.pageModified = false;
      $http.get("/api/pages/" + id).then(function(response) {
        var page = response.data.page;
        $scope.pageId = page.id;
        $scope.pageName = page.name;
        $scope.pageMarkdown = page.markdown;
        $scope.updateRendering(page.html);
      });
    };
    // end::page-load[]

    $scope.updateRendering = function(html) {
      document.getElementById("rendering").innerHTML = html;
    };

    $scope.save = function () {
      var payload;
      if ($scope.pageId === undefined) {
        payload = {
          "name": $scope.pageName,
          "markdown": $scope.pageMarkdown
        };
        $http.post("/api/pages", payload).then(function(ok) {
          $scope.reload();
          $scope.success("Page created");
          var guessMaxId = _.maxBy($scope.pages, function(page) { return page.id; });
          $scope.load(guessMaxId.id || 0);
        }, function(err) {
          $scope.error(err.data.error);
        });
      } else {
        var payload = {
          "client": clientUuid,
          "markdown": $scope.pageMarkdown
        };
        $http.put("/api/pages/" + $scope.pageId, payload).then(function(ok) {
          $scope.success("Page saved");
        }, function(err) {
          $scope.error(err.data.error);
        });
      }
    };

    $scope.delete = function() {
      $http.delete("/api/pages/" + $scope.pageId).then(function(ok) {
        $scope.reload();
        $scope.newPage();
        $scope.success("Page deleted");
      }, function(err) {
        $scope.error(err.data.error);
      });
    };

    $scope.success = function(message) {
      $scope.alertMessage = message;
      var alert = document.getElementById("alertMessage");
      alert.classList.add("alert-success");
      alert.classList.remove("invisible");
      $timeout(function() {
        alert.classList.add("invisible");
        alert.classList.remove("alert-success");
      }, 3000);
    };

    $scope.error = function(message) {
      $scope.alertMessage = message;
      var alert = document.getElementById("alertMessage");
      alert.classList.add("alert-danger");
      alert.classList.remove("invisible");
      $timeout(function() {
        alert.classList.add("invisible");
        alert.classList.remove("alert-danger");
      }, 5000);
    };

    $scope.reload();
    $scope.newPage();

    var markdownRenderingPromise = null;
    $scope.$watch("pageMarkdown", function (text) {
      if (markdownRenderingPromise !== null) {
        $timeout.cancel(markdownRenderingPromise);
      }
      markdownRenderingPromise = $timeout(function() {
        markdownRenderingPromise = null;
        $http.post("/app/markdown", text).then(function (response) {
          $scope.updateRendering(response.data);
        });
      }, 300);
    });

    // tag::event-bus-js-setup[]
    var clientUuid = generateUUID();
    var eb = new EventBus(window.location.protocol + "//" + window.location.host + "/eventbus");
    eb.onopen = function () {
      eb.registerHandler("page.saved", function (error, message) {
        if (message.body
          && $scope.pageId === message.body.id
          && clientUuid !== message.body.client) {
          $scope.$apply(function () {
            $scope.pageModified = true;
          });
        }
      });
    };
    // end::event-bus-js-setup[]

  }]);
