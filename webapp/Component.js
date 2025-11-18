/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "customflp/launchpad/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("customflp.launchpad.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                //IMAGES PATH MODEL
                var oImageModel = new sap.ui.model.json.JSONModel({
                    path: jQuery.sap.getModulePath("customflp.launchpad")
                });
                this.setModel(oImageModel, "imageModel");
            }
        });
    }
);