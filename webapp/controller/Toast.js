sap.ui.define([
    "sap/ui/core/Control"
  ], function (Control) {
    "use strict";
  
    return Control.extend("customflp.launchpad.controls.CustomToast", {
      metadata: {
        properties: {
          text: "string",
          duration: { type: "int", defaultValue: 3000 },
          type: { type: "string", defaultValue: "info" } // 'info', 'success', 'error'
        }
      },
  
      renderer: function (oRm, oControl) {
        oRm.write("<div");
        oRm.addClass("customToast");
        oRm.addClass(oControl.getType());
        oRm.writeClasses();
        oRm.write(">");
        oRm.writeEscaped(oControl.getText());
        oRm.write("</div>");
      },
  
      show: function () {
        const $el = this.$();
        $el.addClass("show");
  
        setTimeout(() => {
          $el.removeClass("show");
          this.destroy(); // cleanup
        }, this.getDuration());
      }
    });
  });
  