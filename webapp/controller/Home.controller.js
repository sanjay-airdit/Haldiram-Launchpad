sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "customflp/launchpad/model/catalogues",
    "sap/m/MessageBox",
    "sap/ui/core/ws/WebSocket",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "customflp/launchpad/model/formatter",
    "sap/ui/core/Theming",
],
    function (Controller, catalogues, MessageBox, WebSocket, MessageToast, JSONModel, Filter, formatter, Theming) {
        "use strict";

        return Controller.extend("customflp.launchpad.controller.Home", {
            formatter: formatter,
            onInit: function () {
                //READ URL PARAMETERS
                // const sParamValue = new URL(window.location.href).searchParams.get("sap-ui-xx-viewCache");
                // console.log("Parameter value:", sParamValue);
                debugger
                window.addEventListener("popstate", function (oEvent) {
                    if (oEvent.state && oEvent.state?.component) {
                        let sComponent = oEvent.state.component
                        let oParams = oEvent.state.params;
                        sap.ui.getCore().navigateExternal(
                            sComponent,
                            "",
                            oParams ? { params: oParams } : {}
                        );
                        //sap.ui.getCore().navigateExternal(sComponent, '', oParams)
                    }
                });
                this._ReadLandingPageContent()
                sap.ui.getCore().navigateExternal = function (componentName, bspAppName, data) {
                    let oPageContainer = this.getView().byId("pageContainer")
                    // Destroy all pages except the first
                    // oPageContainer.getPages().slice(1).forEach(page => page.destroy());

                    if (componentName === 'aidgdashboard') {
                        oPageContainer.to("aidgdashboard", "show", {})
                    } else {
                        // Destroy page if already present
                        let oExistingComponent = sap.ui.getCore().byId(componentName);
                        if (oExistingComponent) {
                            oExistingComponent.destroy();
                        }

                        //REGISTER MODULES
                        // let modulePath = componentName.replaceAll(".", "/");
                        // let bspPath = `/sap/bc/ui5_ui5/sap/${bspAppName.toLowerCase()}`;
                        // sap.ui.loader.config({
                        //     paths: {
                        //         [modulePath]: bspPath
                        //     }
                        // });

                        this._CreateComponent(componentName);
                        oPageContainer.to(componentName, "show", data)
                    }


                }.bind(this)
                // sap.ui.getCore().navContainer = this.getView().byId("pageContainer")

                ////___________________WEBSOCKET CONNECTION______________________////
                this.getView().setModel(new JSONModel({ count: null, data: null }), 'NotificationModel')
                let oURL = new URL(window.location.href);
                let sClient = oURL.searchParams.get("sap-client");
                let that = this;

                this.WebSocket = new WebSocket(`/sap/bc/apc/sap/zqudg_apc?sap-client=${sClient}`);
                this.WebSocket.attachOpen(null, function (e) {
                    console.log('CONNECTION TO WEBSOCKET SUCCESSFULL..!!')
                    that._GetNotificationCount()
                }, this)
                this.WebSocket.attachError(null, function (e) {
                    console.log('WEBSOCKET CONNECTION FAILED..!!')
                    that._GetNotificationCount()
                }, this)
                this.WebSocket.attachMessage(null, function (e) {
                    // console.log('NEW NOTIFICATION...!!!')
                    //MessageToast.show('You have New Notification(s)..!!!')
                    that._GetNotificationCount()
                }, this);
            },

            //_________________________LOADING COMPONENTS AND HANDLING NAVIGATION___________________//
            _ReadLandingPageContent: function () {
                sap.ui.core.BusyIndicator.show(0)
                const oModel = this.getOwnerComponent().getModel();
                oModel.read("/ZC_QU_DG_CATALOG_CONFIG", {
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        const aAllData = oData.results;
                        //PROFILE MODEL
                        this.getView().setModel(new JSONModel({ name: aAllData[0].uname }), 'profileModel')


                        // Step 1: Group by unique URL
                        const oGroupedByUrl = aAllData.reduce((acc, item) => {
                            if (!acc[item.url]) {
                                acc[item.url] = {
                                    CatId: item.url,
                                    ui5_component: "",
                                    Appname: "",
                                    Catdesc: item.catDesc,
                                    icon: item.icon,
                                    tiles: [],
                                    userName: item.uname
                                };
                            }

                            try {
                                const jsonObj = JSON.parse(item.config);
                                const tileConfig = JSON.parse(jsonObj.tileConfiguration);
                                acc[item.url].tiles.push(tileConfig);
                            } catch (e) {
                                console.warn("Invalid JSON in config:", item.config);
                            }

                            return acc;
                        }, {});

                        // Step 2: Convert object to array and remove duplicate tiles
                        const aLeftPageData = Object.values(oGroupedByUrl).map(cat => {
                            const uniqueTiles = new Map();

                            cat.tiles.forEach(tile => {
                                if (tile.semantic_object && !uniqueTiles.has(tile.semantic_object)) {
                                    uniqueTiles.set(tile.semantic_object, tile);
                                }
                            });

                            cat.tiles = Array.from(uniqueTiles.values());
                            return cat;
                        });

                        // Step 3: Set to model
                        this.getOwnerComponent().setModel(new sap.ui.model.json.JSONModel(aLeftPageData), "CatalogueTiles");

                        //ADDING HOME PAGE
                        let sHomeComponent = 'aidgdashboard'
                        let sHomeBspName = "zaidgdashboard"
                        this._CreateHomePageContent(sHomeComponent, sHomeBspName)
                    }.bind(this),

                    error: function () {
                        sap.ui.core.BusyIndicator.hide();
                    }.bind(this)
                });
            },
            _CreateHomePageContent: function (component, bsp) {
                sap.ui.core.BusyIndicator.show(0);
                //REGISTER MODULE
                let registerObjects = {};
                let urlPath = "/sap/bc/ui5_ui5/sap/";
                let bspPath = urlPath + bsp.toLowerCase();
                let modulePath = component.replaceAll(".", "/");
                registerObjects[modulePath] = bspPath;
                sap.ui.loader.config({
                    paths: registerObjects
                });

                //CREATE COMPONENT
                let oPageContainer = this.getView().byId("pageContainer")
                let oComponentContainer = new sap.ui.core.ComponentContainer({
                    name: component,
                    async: true,
                    lifecycle: sap.ui.core.ComponentLifecycle.Container,
                    propagateModel: true,
                    height: "100%",
                    width: "100%",
                });
                oComponentContainer.attachComponentCreated((e) => {
                    sap.ui.core.BusyIndicator.hide();
                    this._CreateAndRegisterAllComponents()
                })

                let page = new sap.m.Page(component, {
                    showHeader: false,
                    title: '',
                    titleAlignment: sap.m.TitleAlignment.Center,
                    content: [oComponentContainer],
                });

                page.addEventDelegate({
                    canSkipRendering: true,
                    onAfterShow: function (evt) { },
                    beforeShow: function (e) { },
                    beforeFirstShow: function (e) { },
                    beforeHide: function (e) { },
                });
                oPageContainer.addPage(page);
            },
            _CreateComponent: function (key) {
                let that = this;
                let oPageContainer = this.getView().byId("pageContainer")
                let oComponentContainer = new sap.ui.core.ComponentContainer({
                    name: key,
                    async: false,
                    lifecycle: sap.ui.core.ComponentLifecycle.Container,
                    propagateModel: true,
                    height: "100%",
                    width: "100%",
                    // settings: {
                    //     componentData: {
                    //         startupParameters: {
                    //             myParam1: "value1",
                    //             myParam2: "value2"
                    //         }
                    //     }
                    // },
                });
                // oComponentContainer.attachComponentCreated((e) => {
                // })

                let page = new sap.m.Page(key, {
                    showHeader: false,
                    title: '',
                    titleAlignment: sap.m.TitleAlignment.Center,
                    content: [oComponentContainer],
                });

                page.addEventDelegate({
                    canSkipRendering: true,
                    onAfterShow: function (evt) {
                        let aCrossNavApps = ['zmaterialcreate.materialcreate', 'qudgmaterialmassupload', 'massedit', 'businesspartner', 'equipment', 'bpvendor']
                        if (aCrossNavApps.includes(evt.toId)) {
                            let oStartUpParams = evt.data
                            let oComponentInstance = evt.to.getContent()[0].getComponentInstance()
                            oComponentInstance.onStartUpParams(oStartUpParams)
                        }

                    },
                    beforeShow: function (e) { },
                    beforeFirstShow: function (e) { },
                    beforeHide: function (e) { },
                });
                oPageContainer.addPage(page);

                // sap.ui.core.Component.create({
                //     name: key,
                // }).then(function (oComponent) {
                //     const oContainer = new sap.ui.core.ComponentContainer({
                //         component: oComponent,
                //         height: "100%",
                //         width: "100%",
                //         propagateModel: true,
                //         lifecycle: sap.ui.core.ComponentLifecycle.Container
                //     });
                //     that.Components.push(oComponent)

                //     // Add this container to a page, then navigate
                //     let page = new sap.m.Page(key, {
                //         showHeader: false,
                //         title: '',
                //         titleAlignment: sap.m.TitleAlignment.Center,
                //         content: [oContainer],
                //     });

                //     page.addEventDelegate({
                //         canSkipRendering: true,
                //         onAfterShow: function (evt) {
                //             debugger;
                //             let oStartUpParams = evt.data.params
                //             if (oStartUpParams) {
                //                 let oComponentInstance = evt.to.getContent()[0].getComponentInstance()
                //                 oComponentInstance.onStartUpParams(oStartUpParams)
                //             }
                //         },
                //         beforeShow: function (e) { },
                //         beforeFirstShow: function (e) { },
                //         beforeHide: function (e) { },
                //     });
                //     oPageContainer.addPage(page);
                // });
            },
            _CreateAndRegisterAllComponents: function () {
                const oModel = this.getOwnerComponent().getModel();
                oModel.read("/ZI_QU_DG_AllCatalogConfigs", {
                    success: function (oData) {
                        const uniqueComponents = new Map();
                        oData.results.forEach(entry => {
                            try {
                                const config = JSON.parse(entry.configuration); // First level parse
                                const tileConfig = JSON.parse(config.tileConfiguration); // Second level parse

                                const component = tileConfig.ui5_component;
                                const url = tileConfig.url;

                                // Avoid duplicates using Map (ensures unique component names)
                                if (component && url && !uniqueComponents.has(component)) {
                                    uniqueComponents.set(component, url);
                                }
                            } catch (e) {
                                console.warn("Failed to parse config:", e);
                            }
                        });
                        const aComponentDetails = Array.from(uniqueComponents, ([component, path]) => ({
                            component,
                            path
                        }))


                        // REGISTER MODULES
                        const oRegisterObjects = {};
                        aComponentDetails.forEach((item) => {
                            let sComponentName = item.component.replaceAll(".", "/");
                            if (!oRegisterObjects[sComponentName]) {
                                oRegisterObjects[sComponentName] = item.path;
                            }
                        })
                        sap.ui.loader.config({
                            paths: oRegisterObjects
                        });

                        // CREATING THE CONTENT
                        aComponentDetails.forEach((item) => {
                            this._CreateComponent(item.component);
                        })
                    }.bind(this),

                    error: function () {
                        sap.ui.core.BusyIndicator.hide();
                    }.bind(this)
                });


            },
            onItemSelect: function (oEvt) {
                let sBspName = oEvt.getParameter('item').getBindingContext('CatalogueTiles').getObject().semantic_object
                let sKey = oEvt.getParameter('item').getBindingContext('CatalogueTiles').getObject().ui5_component
                sap.ui.getCore().navigateExternal(sKey, sBspName, {})
                // sap.ui.getCore().navigateExternal('mdm.md.businesspartner.manage', 'MD_BPS1', {})
                // let oPageContainer = this.getView().byId("pageContainer")

            },
            onNavigate: function (oEvent) {
                sap.ui.core.routing.HashChanger.getInstance().replaceHash("")
                sap.ui.core.BusyIndicator.show(0);
            },
            onNavigationFinished: function (oEvent) {
                sap.ui.core.BusyIndicator.hide();
                // Add hash to browser history
                let sNavFrom = oEvent.getParameter('fromId')
                let sNavTo = oEvent.getParameter('toId')
                let aNav = ['qudgmaterialmassupload', 'zmaterialcreate.materialcreate', 'massedit', 'businesspartner', 'bpvendor']
                if (aNav.includes(sNavTo)) {
                    let oWindowHistoryParameter = {
                        component: sNavFrom
                    }
                    if (sNavFrom === 'businesspartner' && sNavTo === 'bpvendor') {
                        oWindowHistoryParameter.params = sap.ui.getCore().backNavigationFromVendorToBPdata
                    }
                    window.history.replaceState(oWindowHistoryParameter, "", "")
                    window.history.pushState({}, "", "")
                }
            },
            handleNavToHomePage: function () {
                sap.ui.getCore().navigateExternal('aidgdashboard', 'zaidgdashboard', {})
            },
            onSideNavButtonPress: function () {
                let oToolPage = this.getView().byId("toolpage");
                let bSideExpanded = oToolPage.getSideExpanded();
                oToolPage.setSideExpanded(!bSideExpanded);
            },

            //___________________________________USER PROFILE______________________________________//
            onPressUserProfile: function (oEvent) {
                var oButton = oEvent.getSource();
                this.byId("Userprofile").openBy(oButton);
            },
            onPressMyProfile: function (oEvent) {
                if (!this._oDialogProfile) {
                    this._oDialogProfile = new sap.ui.xmlfragment("customflp.launchpad.fragment.MyProfile",
                        this);
                    this.getView().addDependent(this._oDialogProfile);
                }
                this._oDialogProfile.open();

            },
            onCloseProfile: function (oEvent) {
                this._CloseDialogues()
            },
            onPressSignout: function () {
                var Url = "/AIDG";
                MessageBox.show(
                    "Are you sure you want to sign out?", {
                    icon: MessageBox.Icon.INFORMATION,
                    title: "Sign Out",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            window.location.href = Url;
                        }
                    }
                }
                );

            },

            //_____________________________________SETTINGS_______________________________________//
            onPressSetting: function (oEvent) {
                if (!this._oDialogSettings) {
                    this._oDialogSettings = sap.ui.xmlfragment("idUserSettingFragment",
                        "customflp.launchpad.fragment.UserSettings",
                        this
                    );
                    this.getView().addDependent(this._oDialogSettings);
                }
                this._oDialogSettings.open()
            },
            userSettingListUpdateFinished: function (oevent) {
                let oPage = sap.ui.core.Fragment.byId("idUserSettingFragment", '_themes');
                let oPageheader = oPage.getHeaderTitle();
                oPageheader.bindElement({
                    path: "/settingnames/0",
                    model: "SETTINGDATA"
                });
            },
            onPressUserSettingItems: function (oEvent) {
                let oSplitApp = sap.ui.core.Fragment.byId("idUserSettingFragment", "splitApp");
                let sBindingPath = oEvent.getSource().getBindingContextPath();
                let oData = oEvent.getSource().getBindingContext("SETTINGDATA").getObject();
                let oPage = sap.ui.core.Fragment.byId("idUserSettingFragment", oData.id);
                let oPageHeader = oPage.getHeaderTitle()
                oPageHeader.bindElement({
                    path: sBindingPath,
                    model: "SETTINGDATA"
                });
                oSplitApp.toDetail(oPage);
            },
            onPressThemeItem: function (oEvent) {
                let sBindingPath = oEvent.getSource().getBindingContextPath();
                let oData = oEvent.getSource().getBindingContext("THEMEDATA").getObject();
                if (oData.info !== "Selected") {
                    let oModelThemes = this.getView().getModel("THEMEDATA")
                    let aThemeData = oModelThemes.getData();
                    for (let i = 0; i < aThemeData.Themes.length; i++) {
                        if (aThemeData.Themes[i].info === "Selected") {
                            oModelThemes.setProperty("/Themes/" + i + "/info", "");
                        }
                    }

                    oModelThemes.setProperty(sBindingPath + "/info", "Selected");

                }
                Theming.setTheme(oData.id);


            },
            onCloseSettingDialog: function (oEvent) {
                this._CloseDialogues();
            },

            //_____________________________________NOTIFICATIONS___________________________________//
            _GetNotificationCount: function (oEvent) {
                let oModel = this.getOwnerComponent().getModel("ZP_QU_DG_NOTIFICATION_BND");
                let oNotificationModel = this.getView().getModel('NotificationModel')
                oModel.read("/ZP_QU_DG_Notification", {
                    urlParameters: {
                        "$inlinecount": "allpages"
                    },
                    filters: [new Filter('already_read', 'EQ', false)],
                    success: function (oData, oReponse) {
                        oNotificationModel.setProperty('/count', oData.__count)
                    }.bind(this),
                    error: function (error) {
                        this.getView().setBusy(false);
                    }.bind(this)
                });
            },
            handlePressNotification: function (oEvent) {
                if (!this._NotificationDialog) {
                    this._NotificationDialog = sap.ui.xmlfragment("idNotificationFragment", "customflp.launchpad.fragment.Notifications", this);
                    this.getView().addDependent(this._NotificationDialog);
                }
                let oNotification_IconTab = sap.ui.core.Fragment.byId("idNotificationFragment", "idNotificationIconTabBar");
                oNotification_IconTab.setSelectedKey('All');
                this._NotificationDialog.open();
                this._ReadNotifications();
            },
            onCloseNotification: function (oEvent) {
                this._CloseDialogues();
            },
            _ReadNotifications: function () {
                sap.ui.core.Fragment.byId("idNotificationFragment", "idNotificationIconTabBar").setBusy(true);
                let oModel = this.getOwnerComponent().getModel("ZP_QU_DG_NOTIFICATION_BND")
                let oNotificationModel = this.getView().getModel('NotificationModel')
                oModel.read("/ZP_QU_DG_Notification", {
                    urlParameters: {
                        "$inlinecount": "allpages",
                        "$orderby": "qmdat desc,mzeit desc"
                    },
                    success: function (oData, oRes) {
                        sap.ui.core.Fragment.byId("idNotificationFragment", "idNotificationIconTabBar").setBusy(false);
                        oNotificationModel.setProperty('/data', oData.results)
                        if (oData.results && oData.results.length > 0) {
                            let groupedData = {};
                            oData.results.forEach(notification => {
                                let dateKey = new Date(notification.qmdat).toDateString(); // Group by date
                                if (!groupedData[dateKey]) {
                                    groupedData[dateKey] = [];
                                }
                                groupedData[dateKey].push(notification);
                            });

                            // Prepare data in the format required by NotificationList
                            let finalResults = Object.keys(groupedData).map(date => ({
                                key: date,
                                items: groupedData[date]
                            })).sort((a, b) => new Date(b.key) - new Date(a.key));
                            oNotificationModel.setProperty('/groupByDate', finalResults)
                        }

                    }.bind(this),
                    error: function (error) {
                        sap.ui.core.Fragment.byId("idNotificationFragment", "idNotificationIconTabBar").setBusy(false);
                        console.error("Error reading notifications: ", error);
                        if (error.responseText) {
                            try {
                                let errorDetails = JSON.parse(error.responseText);
                                console.error("Error details:", errorDetails);
                            } catch (e) {
                                console.error("Error parsing error response text:", error.responseText);
                            }
                        }
                    }

                });

                //RESETTING THE COUNT
                oModel.callFunction('/mark_read', {
                    method: "POST",
                    urlParameters: {
                        DelFlag: false
                    },
                    success: function (oData, oRes) {
                        this._GetNotificationCount();
                    }.bind(this),
                    error: function (oErr) {

                    }.bind(this)
                })
            },
            onDeleteNotificationItem: function (oEvent) {
                let sNotificationId = oEvent.oSource.getBindingContext("NotificationModel").getObject().notif_id
                var sPath = "/ZP_QU_DG_Notification(guid'" + sNotificationId + "')";
                var oModel = this.getOwnerComponent().getModel("ZP_QU_DG_NOTIFICATION_BND");
                oModel.remove(sPath, {
                    success: function () {
                        MessageToast.show("Notification deleted successfully.");
                        this._ReadNotifications()
                    }.bind(this),
                    error: function (oError) {
                        MessageToast.show("Failed to delete notification.");
                    }
                });
            },
            onDeleteAllNotifications: function (oEvent) {
                let oNotificationModel = this.getOwnerComponent().getModel('ZP_QU_DG_NOTIFICATION_BND')
                oNotificationModel.callFunction('/mark_read', {
                    method: "POST",
                    urlParameters: {
                        DelFlag: true
                    },
                    success: function (oData, oRes) {
                        let sStatus = JSON.parse(oRes.headers["sap-message"]).severity
                        if (sStatus === 'success') {
                            let sMsg = JSON.parse(oRes.headers["sap-message"]).message
                            this._GetNotificationCount();
                            this._ReadNotifications();
                            MessageToast.show(sMsg)
                        }

                    }.bind(this),
                    error: function (oErr) {
                    }.bind(this)
                })
            },
            onPressNotificationItem: function (oEvent) {
                var oNotificationData = oEvent.getSource().getBindingContext("NotificationModel").getObject();
                let oMyTaskModel = this.getOwnerComponent().getModel("ZP_QU_DG_MYTASK_BND")
                let bodyText = oNotificationData?.body_text;
                let sRequestId = bodyText.split(" ")[1];
                let COMPONENT_MAP = {
                    MM: {
                        CREATE: 'zmaterialcreate.materialcreate',
                        UPDATE: 'zmaterialcreate.materialcreate',
                        COPY: 'zmaterialcreate.materialcreate',
                        DELETE: 'zmaterialcreate.materialcreate',
                        CREATE_MAS: 'qudgmaterialmassupload',
                        'MASS UPDATE': 'massedit'
                    },
                    BP: {
                        CREATE: 'businesspartner',
                        UPDATE: 'businesspartner',
                        COPY: 'businesspartner',
                        DELETE: 'businesspartner',
                    },
                    EQ: {
                        CREATE: 'equipment',
                        UPDATE: 'equipment',
                        COPY: 'equipment',
                        DELETE: 'equipment',
                    }
                };
                let that = this;
                try {
                    sap.ui.core.BusyIndicator.show();
                    oMyTaskModel.read("/ZP_QU_DG_MYTASK", {
                        filters: [
                            new Filter("Technical_WorkFlow_Object", sap.ui.model.FilterOperator.EQ, sRequestId)
                        ],
                        success: function (oData, oRes) {
                            sap.ui.core.BusyIndicator.hide();
                            if (oData.results && oData.results.length > 0) {
                                console.log("Matching Task Data:", oData.results[0]);
                                let oReqData = oData.results[0]

                                let sComponent = COMPONENT_MAP[oReqData.Master]?.[oReqData.reqtyp];
                                let oParams = {
                                    REQID: oReqData.Technical_WorkFlow_Object,
                                    SNO: 1,
                                    MATNR: oReqData.ObjectNumber.replace(/^0+/, ""),
                                    ISACTIVEENTITY: true,
                                    WIID: oReqData.WorkItem_ID,
                                    // TOP_WIID: oReqData.TopLevelWorkflowTask,
                                    // PROCESS_ID: oReqData.process_id,
                                    // SEQUENCE: oReqData.sequence
                                }

                                if (sComponent) {
                                    sap.ui.getCore().navigateExternal(sComponent, '', { params: oParams });
                                    that._CloseDialogues();
                                }

                            } else {
                                MessageToast.show("No matching task found.");
                            }
                        },
                        error: function (err) {
                            sap.ui.core.BusyIndicator.hide();
                            console.error("Failed to fetch task:", err);
                            MessageToast.show("Error fetching task data.");
                        }
                    });
                } catch (err) {
                    console.error("Unexpected error:", err);
                    MessageToast.show("Unexpected error occurred.");
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }

            },
            _CloseDialogues: function () {
                const aDialogs = ['_oDialogSettings', '_NotificationDialog', '_oDialogProfile'];
                aDialogs.forEach(dialogName => {
                    const oDialog = this[dialogName];
                    if (oDialog) {
                        oDialog.close();
                        oDialog.destroy();
                        this[dialogName] = null;
                    }
                });

            }

        });
    });
