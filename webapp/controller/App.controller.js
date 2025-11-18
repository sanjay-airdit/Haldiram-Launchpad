sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("customflp.launchpad.controller.App", {
        onInit: function() {
          sap.ui.core.routing.HashChanger.getInstance().replaceHash("")
        }
      });
    }
  );
  