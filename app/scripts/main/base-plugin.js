/**
 * The base plugin class that all editor plugins inherit from. It provides the common support contract for all plugins.
 * Plugins can override specific methods to change the behavior. The most common scenario would be to override the
 * implementation of fabric callback methods to detect interactivity on the canvas.
 *
 * @class EkstepEditor.BasePlugin
 * @author Santhosh Vasabhaktula <santhosh@ilimi.in>
 */
EkstepEditor.basePlugin = Class.extend({
    id: undefined,
    parent: undefined,
    children: [],
    manifest: undefined,
    editorObj: undefined,
    editorData: undefined,
    data: undefined,
    attributes: { x: 0, y: 0, w: 0, h: 0, visible: true, editable: true },
    config: undefined,
    event: undefined,
    events: undefined,
    params: undefined,
    media: undefined,
    configManifest: undefined,

    /**
     * Initializes the plugin with the given manifest and parent object
     * @param manifest {object} Manifest details for this plugin
     * @param data {object} Init parameters for the plugin
     * @param parent {object} Parent plugin object that instantiated this
     * @constructor
     * @memberof EkstepEditor.BasePlugin
     */
    init: function(manifest, data, parent) {
      var instance = this;
        this.manifest = _.cloneDeep(manifest);
        if (arguments.length == 1) {
            this.registerMenu();
            this.initialize();
            EkstepEditorAPI.addEventListener(this.manifest.id + ":create", this.create, this);
            console.log(manifest.id + " plugin initialized");
        } else {
            this.editorObj = undefined, this.event = undefined, this.attributes = { x: 0, y: 0, w: 0, h: 0, visible: true }, this.params = undefined, this.data = undefined, this.media = undefined;
            this.editorData = data;
            this.children = [];
            this.id = this.editorData.id || UUID();
            this.parent = parent;
            this.config = { opacity: 100, strokeWidth: 1, stroke: "rgba(255, 255, 255, 0)", autoplay: false, visible: true };
        }
        if (!EkstepEditor.baseConfigManifest) {
            EkstepEditor.loadBaseConfigManifest(function() {
                instance.configManifest = _.clone(EkstepEditor.baseConfigManifest, true);
            })
        } else {
            this.configManifest = _.clone(EkstepEditor.baseConfigManifest, true);
        }
    },

    /**
     * Initializes the plugin by reading from ECML.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    initPlugin: function() {
        this.fromECML(this.editorData);
        this.newInstance();
        this.postInit();
    },

    /**
     * Post init tasks for the plugin
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    postInit: function() {
        this.registerFabricEvents();
        if (this.editorObj) { this.editorObj.set({ id: this.id }); this.editorObj.setVisible(true); }
        if (this.parent) this.parent.addChild(this);
        if (this.parent && this.parent.type !== 'stage') EkstepEditorAPI.dispatchEvent('object:modified', { id: this.id });
        if(_.has(this.manifest.editor, 'behaviour')) {
            if(!_.isUndefined(this.manifest.editor.behaviour.rotatable) && (this.manifest.editor.behaviour.rotatable === true)) {
                if (this.editorObj) { this.editorObj.hasRotatingPoint = true; }
            }
        }
    },

    /**
     * Registers the menu for this plugin. By default, the base plugin handles the menu additions.
     * Child implementations can use this method to override and register additional menu items.
     * @memberof EkstepEditor.BasePlugin
     */
    registerMenu: function() {
        var instance = this;
        this.manifest.editor.menu = this.manifest.editor.menu || [];
        _.forEach(this.manifest.editor.menu, function(menu) {
            menu.iconImage = menu.iconImage ? instance.relativeURL(menu.iconImage) : menu.iconImage;
            if (menu.submenu) {
                _.forEach(menu.submenu, function(dd) {
                    dd.iconImage = dd.iconImage ? instance.relativeURL(dd.iconImage) : dd.iconImage;
                });
            }
            if (menu.category === 'main') {
                EkstepEditor.toolbarManager.registerMenu(menu);
            } else if (menu.category === 'context') {
                EkstepEditor.toolbarManager.registerContextMenu(menu);
            } else if (menu.category === 'config') {
                EkstepEditor.toolbarManager.registerConfigMenu(menu);
            }
        });
    },

    /**
     * Returns relative URL for a particular asset. Plugins should use this method instead of
     * hard-coding the asset URLs.
     * @memberof EkstepEditor.BasePlugin
     */
    relativeURL: function(src) {
        return EkstepEditor.relativeURL(this.manifest.id, this.manifest.ver, src);
    },

    /**
     * Returns the type of this plugin (manifest ID)
     * @memberof EkstepEditor.BasePlugin
     */
    getType: function() {
        return this.manifest ? this.manifest.id : '';
    },

    /**
     * Returns the version of this plugin (manifest ID)
     * @memberof EkstepEditor.BasePlugin
     */
    getVersion: function() {
        return this.manifest ? this.manifest.ver : '';
    },

    /**
     * Registers listeners for Fabricjs events from the canvas. Child implementations should override
     * the actual callback methods instead of overriding this one.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    registerFabricEvents: function() {
        if (this.editorObj) {
            this.editorObj.on({
                added: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.added(inst, options, event);
                    if (inst.editorObj) {
                        EkstepEditorAPI.updatePluginDimensions(inst);
                    }
                },
                removed: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.removed(inst, options, event);
                    _.forEach(inst.children, function(child, index) {
                        child.editorObj.remove();
                    });
                    inst.remove();
                },
                selected: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.selected(inst, options, event)
                },
                deselected: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.deselected(inst, options, event)
                },
                modified: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    if (inst.editorObj) {
                        EkstepEditorAPI.updatePluginDimensions(inst);
                    }
                    inst.changed(inst, options, event)
                },
                rotating: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.rotating(inst, options, event)
                },
                scaling: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.scaling(inst, options, event);
                },
                moving: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.moving(inst, options, event)
                },
                skewing: function(options, event) {
                    var inst = EkstepEditorAPI.getPluginInstance(this.id);
                    inst.skewing(inst, options, event)
                }
            });
        }
    },

    /**
     * Helper method to load a given resource relative to the plugin.
     * @memberof EkstepEditor.BasePlugin
     */
    loadResource: function(src, dataType, cb) {
        EkstepEditorAPI.loadPluginResource(this.manifest.id, this.manifest.ver, src, dataType, cb);
    },

    /**
     * Removes the plugin from the stage. This can be used to perform self cleanup. If this method is called
     * from newInstance(), plugin won't be added to stage children.
     * @memberof EkstepEditor.BasePlugin
     */
    remove: function() {
        this.parent.removeChild(this);
        this.parent =  undefined; // if this method is called from newInstance(), plugin won't be added to stage children
        delete EkstepEditor.pluginManager.pluginInstances[this.id];
    },

    /**
     * Creates the instance of the plugin when a new object is added to the canvas.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    create: function(event, data) {
        EkstepEditorAPI.instantiatePlugin(this.manifest.id, _.clone(data), EkstepEditor.stageManager.currentStage);
    },

    /**
     * Adds a child to this object. This can be useful for composite scenarios.
     * @memberof EkstepEditor.BasePlugin
     */
    addChild: function(plugin) {
        this.children.push(plugin);
    },

    /**
     * Removes a child from this plugin. Use this to dynamically manage composite children.
     * @memberof EkstepEditor.BasePlugin
     */
    removeChild: function(plugin) {
        this.children = _.reject(this.children, { id: plugin.id });
    },

    /**
     * Initialize the plugin when it is loaded. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    initialize: function(data) {},

    /**
     * Instantiate an object of the plugin type. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    newInstance: function(data) {},

    /**
     * Called when the plugin is added to the canvas. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    added: function(instance, options, event) {},

    /**
     * Called when the plugin is removed from the canvas. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    removed: function(instance, options, event) {},

    /**
     * Called when the object is selected on the canvas. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    selected: function(instance, options, event) {},

    /**
     * Called when the object loses focus on the canvas. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    deselected: function(instance, options, event) {},

    /**
     * Called when the object is modified (dragged, resized or rotated). This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    changed: function(instance, options, event) {},

    /**
     * Called continuously while the object is rotating. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    rotating: function(instance, options, event) {},

    /**
     * Called continuously while the object is scaling. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    scaling: function(instance, options, event) {},

    /**
     * Called continuously while the object is being dragged. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    moving: function(instance, options, event) {},

    /**
     * Called continuously while the object is being skewed. This is a no-op implementation and child classes must
     * provide the complete functional implementation.
     * @memberof EkstepEditor.BasePlugin
     */
    skewing: function(instance, options, event) {},

    /**
     * Allows plugins to create a copy of the object. Default implementation just creates a clone. Child
     * classes can override the logic to customize how copy is done.
     * @memberof EkstepEditor.BasePlugin
     */
    doCopy: function() {
        return this.editorObj;
    },

    /**
     * Returns a copy of the object by converting it to ECML markup.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    getCopy: function() {
        return this.toECML();
    },

    /**
     * Renders the plugin to canvas. Default implementation adds the editor fabric object to canvas.
     * Complex plugins and templates should override this if necessary.
     * @memberof EkstepEditor.BasePlugin
     */
    render: function(canvas) {
        canvas.add(this.editorObj);
    },

    /**
     * Returns the metadata of the object. This is a no-op implementation. Child plugins should override
     * this method to return custom metadata.
     * @memberof EkstepEditor.BasePlugin
     */
    getMeta: function() { },

    /**
     * Utility method to convert canvas pixels to relative units. By design, all rendering must work with
     * relative units to allow content to be rendered on different types of devices with different pixel
     * ratios and density. Plugins must always use the relative units for rendering.
     * @memberof EkstepEditor.BasePlugin
     */
    pixelToPercent: function(obj) {
        obj.x = parseFloat(((obj.x / 720) * 100).toFixed(2));
        obj.y = parseFloat(((obj.y / 405) * 100).toFixed(2));
        obj.w = parseFloat(((obj.w / 720) * 100).toFixed(2));
        obj.h = parseFloat(((obj.h / 405) * 100).toFixed(2));
        obj.rotate = parseFloat(obj.rotate);
    },

    /**
     * Utility method to convert relative units to pixels on canvas. By design, all rendering must work with
     * relative units to allow content to be rendered on different types of devices with different pixel
     * ratios and density. Plugins must always use the relative units for rendering.
     * @memberof EkstepEditor.BasePlugin
     */
    percentToPixel: function(obj) {
        obj.x = obj.x * (720 / 100);
        obj.y = obj.y * (405 / 100);
        obj.w = obj.w * (720 / 100);
        obj.h = obj.h * (405 / 100);
        obj.rotate = obj.rotate;
    },

    /**
     * Sets the config for this object. Override this method to parse the config if necessary.
     * @memberof EkstepEditor.BasePlugin
     */
    setConfig: function(data) {
        this.config = data;
    },

    /**
     * Adds a given config key and value pair to the config for this plugin instance.
     * @memberof EkstepEditor.BasePlugin
     */
    addConfig: function(key, value) {
        if (_.isUndefined(this.config)) this.config = {};
        this.config[key] = value;
    },

    /**
     * Returns the config for this plugin. Child plugins should override this method to generate the
     * custom plugin JSON objects.
     * @memberof EkstepEditor.BasePlugin
     */
    getConfig: function() {
        return this.config;
    },

    /**
     * Returns the data that this plugin might set and use at runtime. As a best practice, plugins should
     * differentiate between config (e.g. rendering colors, font size, levels etc) and data (actual
     * word details to use).
     * @memberof EkstepEditor.BasePlugin
     */
    setData: function(data) {
        this.data = data;
    },

    /**
     * Returns the data for this plugin. Data includes actual drivers - such as the words in a word game
     * or questions in a quiz. Plugins should set their data is they want to differentiate from
     * the config.
     * @memberof EkstepEditor.BasePlugin
     */
    getData: function() {
        return this.data;
    },

    /**
     * Manages the ECML attributes for the plugins. This includes x,y,w,h and rotation related attributes
     * that are common to all plugins.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    setAttributes: function(attr) {
        _.merge(this.attributes, attr);
    },

    /**
     * Returns the ECML attributes for the plugins. This includes x,y,w,h and rotation related attributes
     * that are common to all plugins.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    getAttributes: function() {
        return _.omit(this.attributes, ['top', 'left', 'width', 'height']);
    },

    /**
     * Modigies the ECML attributes for the plugins. This includes x,y,w,h and rotation related attributes
     * that are common to all plugins.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    setAttribute: function(key, value) {
        this.attributes[key] = value;
    },

    /**
     * Returns the individual ECML attribute for the plugins. This includes x,y,w,h and rotation related attributes
     * that are common to all plugins.
     * @param key {string} Attribute name
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    getAttribute: function(key) {
        return this.attributes[key];
    },

    /**
     * Adds a runtime event listener for this plugin. Plugins can respond to events on the renderer
     * such as stage entry, exit or results of evaluation.
     * @param event {object} Event object
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    addEvent: function(event) {
        if (_.isUndefined(this.event)) this.event = [];
        this.event.push(event);
    },

    /**
     * Returns the list of runtime events configured for this plugin. Plugins can respond to events on the renderer
     * such as stage entry, exit or results of evaluation.
     * @param event {object} Event object
     * @memberof EkstepEditor.BasePlugin
     */
    getEvents: function() {
        return this.event;
    },

    /**
     * Adds a runtime param - such as teacher instructions to the ECML output. Params are like shared variables
     * that can be used for evaluation across stages on the renderer.
     * @param key {string} Name of the runtime parameter
     * @param value {object} Data of the parameter
     * @memberof EkstepEditor.BasePlugin
     */
    addParam: function(key, value) {
        if (_.isUndefined(this.params)) this.params = {};
        this.params[key] = value;
    },

    /**
     * Removes a runtime param for this plugin.
     * @param key {string} Name of the param to remove.
     * @memberof EkstepEditor.BasePlugin
     */
    deleteParam: function(key){
        if(this.params) delete this.params[key];
    },

    /**
     * Returns the list of runtime params for this plugin.
     * @memberof EkstepEditor.BasePlugin
     */
    getParams: function() {
        return this.params;
    },

    /**
     * Returns the specified runtime parameter details. Note that the value of the parameter
     * is only available at runtime.
     * @param key {string} Name of the param to return.
     * @memberof EkstepEditor.BasePlugin
     */
    getParam: function(key) {
        return this.params ? this.params[key] : undefined;
    },

    /**
     * Adds media to the manifest of this plugin. You can add media such as images, audios, or even
     * other runtime dependencies such as JS, CSS and other plugin files. If you don't declare a
     * media, it will not be included in the content download archive.
     * @param media {object} Media to be included at runtime.
     * @memberof EkstepEditor.BasePlugin
     */
    addMedia: function(media) {
        if (_.isUndefined(this.media)) this.media = {};
        this.media[media.id] = media;
    },

    /**
     * Returns the media manifest of this plugin. You can add media such as images, audios, or even
     * other runtime dependencies such as JS, CSS and other plugin files. If you don't declare a
     * media, it will not be included in the content download archive.
     * @param media {object} Media to be included at runtime.
     * @memberof EkstepEditor.BasePlugin
     */
    getMedia: function() {
        return this.media;
    },

    /**
     * Returns the renderer dimensions for this plugin. This includes the x,y,w,h bounding box,
     * and the rotation of the object.
     * @memberof EkstepEditor.BasePlugin
     */
    getRendererDimensions: function() {
        var attr = this.getAttributes();
        var dims = {
            x: attr.x,
            y: attr.y,
            w: attr.w,
            h: attr.h,
            rotate: attr.rotate
        }
        this.pixelToPercent(dims);
        return dims;
    },

    /**
     * Generates and returns the ECML string for this plugin.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    toECML: function() {
        if(this.editorObj) EkstepEditorAPI.updatePluginDimensions(this);
        var attr = _.clone(this.getAttributes());
        attr.id = this.id;
        this.pixelToPercent(attr);
        if (!_.isUndefined(this.getData())) {
            attr.data = {
                "__cdata": JSON.stringify(this.getData())
            };
        }
        if (!_.isUndefined(this.getConfig())) {
            attr.config = {
                "__cdata": JSON.stringify(this.getConfig())
            };
        }
        if (!_.isUndefined(this.getEvents())) {
            // attr.config = {
            //     "__cdata": JSON.stringify(this.getEvents())
            // };
            attr.event = this.getEvents();
        }
        if (!_.isUndefined(this.getParams())) {
            attr.param = [];
            _.forIn(this.getParams(), function(value, key) {
                attr.param.push({ name: key, value: value });
            });
        }
        return attr;
    },

    /**
     * Parses the ECML to construct this object.
     * @private
     * @param data {object} ECML to recontruct from
     * @memberof EkstepEditor.BasePlugin
     */
    fromECML: function(data) {
        var instance = this;
        this.attributes = data;
        if (!_.isUndefined(this.attributes.data)) {
            this.data = this.attributes.data.__cdata ? JSON.parse(this.attributes.data.__cdata) : this.attributes.data;
            delete this.attributes.data;
        }
        if (!_.isUndefined(this.attributes.config)) {
            this.config = this.attributes.config.__cdata ? JSON.parse(this.attributes.config.__cdata) : this.attributes.config;
            delete this.attributes.config;
        }
        if (!_.isUndefined(this.attributes.events)) {
            //this.events = JSON.parse(this.attributes.event.__cdata);
            delete this.attributes.events;
        }
        if (!_.isUndefined(this.attributes.event)) {
            //this.events = JSON.parse(this.attributes.event.__cdata);
            this.event = this.attributes.event;
            delete this.attributes.event;
        }
        if (!_.isUndefined(this.attributes.param)) {
            _.forEach(this.attributes.param, function(param) {
                instance.addParam(param.name, param.value);
            })
            delete this.attributes.param;
        }
        if (!_.isUndefined(this.attributes.asset)) {
            if (!_.isUndefined(this.attributes.assetMedia)) {
                instance.addMedia(this.attributes.assetMedia);
                delete this.attributes.assetMedia;
            } else {
                var media = EkstepEditor.mediaManager.getMedia(this.attributes.asset);
                if (!_.isUndefined(media)) {
                    instance.addMedia(media);
                }
            }
        }
        this.percentToPixel(this.attributes);
    },

    /**
     * Utility function to conver the data of the object to Fabric properties - a simple variable
     * transformation that returns the corresponding fabric parameter names.
     * @param data {object} Data of the current plugin instance.
     * @memberof EkstepEditor.BasePlugin
     */
    convertToFabric: function(data) {
        var retData = _.clone(data);
        if (data.x) retData.left = data.x;
        if (data.y) retData.top = data.y;
        if (data.w) retData.width = data.w;
        if (data.h) retData.height = data.h;
        if (data.radius) retData.rx = data.radius;
        if (data.color) retData.fill = data.color;
        if (data.rotate) retData.angle = data.rotate;
        return retData;
    },
    getConfigManifest: function() {
        if (!this.manifest.editor.configManifest) { this.manifest.editor.configManifest = []; }
        var configManifest = this.manifest.editor.configManifest
        if (this.configManifest) {
            configManifest = _.uniqBy(_.clone(_.concat(this.manifest.editor.configManifest, this.configManifest),true),'propertyName');
        }
        if (!(this.manifest.editor.playable && this.manifest.editor.playable === true)) {
          _.remove(configManifest, function (cm) {return cm.propertyName === 'autoplay'})
        }
        return configManifest
    },

    /**
     * Allows a plugin to update the context menu when the plugin instance is selected. Plugins can use
     * this method to change any specific custom context menu actions.
     * @memberof EkstepEditor.BasePlugin
     */
    updateContextMenu: function() {

    },

    /**
     * Plugins can override this to reset their configuration.
     * @memberof EkstepEditor.BasePlugin
     */
    reConfig: function() {
    },

    /**
     * Called when the configuration is modified for the plugin. This is useful if the plugin
     * has to provide WYSIWYG feedback on the fabric canvas.
     * @param key {string} Config property name
     * @param value {string} Value of the config setting.
     * @memberof EkstepEditor.BasePlugin
     */
    _onConfigChange: function(key, value) {
        this.addConfig(key, value);
        var currentInstace = EkstepEditorAPI.getCurrentObject();
        if (currentInstace.config === undefined) { currentInstace.config = {} }
        switch (key) {
            case 'opacity':
                currentInstace.editorObj.setOpacity(value);
                currentInstace.attributes.opacity = value;
                currentInstace.config.opacity = value;
                break;
            case 'strokeWidth':
                value = parseInt(value);
                currentInstace.editorObj.set('strokeWidth', value);
                currentInstace.attributes['stroke-width'] = value;
                currentInstace.attributes['strokeWidth'] = value;
                currentInstace.config.strokeWidth = value;
                break;
            case 'stroke':
                currentInstace.editorObj.setStroke(value);
                currentInstace.attributes.stroke = value;
                currentInstace.config.stroke = value;
                break;
            case 'autoplay':
                currentInstace.attributes.autoplay = value;
                currentInstace.config.autoplay = value;
                break;
            case 'visible':
                currentInstace.attributes.visible = value;
                currentInstace.config.visible = value;
                break;
        }
        EkstepEditorAPI.render();
        EkstepEditorAPI.dispatchEvent('object:modified', { target: EkstepEditorAPI.getEditorObject() });
    },

    /**
     * Returns the help text for this plugin by reading the help markdown file. Plugins can override this
     * to return custom help.
     * @memberof EkstepEditor.BasePlugin
     */
    getHelp: function(cb) {
        var helpText = "Help is not available."
        try {
            this.loadResource(this.manifest.editor.help.src, this.manifest.editor.help.dataType, function(err, help) {
                if (!err) {
                    helpText = help;
                    cb(helpText);
                }
            });
        } catch (e) {
            console.log(e)
            cb(helpText);
        }
    },

    /**
     * Returns the properties that editable for this plugin instance.
     * @private
     * @memberof EkstepEditor.BasePlugin
     */
    getProperties: function() {
        var props = _.omitBy(_.clone(this.attributes), _.isObject);
        props = _.omitBy(props, _.isNaN);
        this.pixelToPercent(props);
        return props;
    },

    /**
     * Renders the configuration view for this plugin. Default functionality is to launch the config
     * property editor. Plugins can override this method to change the way config is rendered.
     * @memberof EkstepEditor.BasePlugin
     */
    renderConfig: function() {

    },

    /**
     * Returns the manifest ID of this object
     * @memberof EkstepEditor.BasePlugin
     */
    getManifestId: function () {
      return (this.manifest.shortId || this.manifest.id);
    }
});
