/* ************************************************************************
   Copyright: 2009 OETIKER+PARTNER AG
   License:   GPLv3 or later
   Authors:   Tobi Oetiker <tobi@oetiker.ch>
   Utf8Check: äöü
************************************************************************ */

/* ************************************************************************
************************************************************************ */

qx.Class.define("dbtoria.ui.form.ControlBuilder", {
    type : 'static',

    statics : {
        /**
         * create a control and bind its value to the formData map
         *
         * @param desc {var} TODOC
         * @param formData {var} TODOC
         * @return {var} TODOC
         * @throws TODOC
         *
         * returns a control according to the description given
         *
         * <pre class='javascript'>
         * { type:    "TextArea",
         *   TODOC
         * },
         * { type:    "IntField",
         *   TODOC
         * },
         * { type:    "FloatField",
         *   TODOC
         * },
         * { type:    "TimeField",
         *   TODOC
         * },
         * { type:    "TextField",
         *   label:   "Label",
         *   filter:  "regexp",
         *   name:    "key"},
         * { type:    "Date",
         *   label:   "Label",
         *   name:    "key"},
         * { type:    "CheckBox",
         *   label:   "Label",
         *   name:    "key"},
         * { type:    "ComboTable",
         *   TODOC
         * },
         * </pre>
         *
         */

        createControl : function(desc, formDataCallback) {
            var control = null;

//            if (desc.copy) {
//                qx.dev.Debug.debugObject(desc);
//            }
            switch(desc.type) {
                case "TextField":
                    control = new dbtoria.ui.form.TextField();
                    break;
                case "FloatField":
                    control = new dbtoria.ui.form.FloatField();
                    break;
                case "IntField":
                    control = new dbtoria.ui.form.IntField();
                    break;
                case "FloatTimeField":
                    control = new dbtoria.ui.form.FloatTimeField();
                    break;
                case "TimeField":
                    control = new dbtoria.ui.form.TimeField();
                    break;
                case "TextArea":
                    control = new dbtoria.ui.form.TextArea();
                    break;
                case "Date":
                    control = new dbtoria.ui.form.DateField();
                    break;
                case "CheckBox":
                    control = new dbtoria.ui.form.CheckBox();
                    break;
                case "ComboTable":
                    control = new dbtoria.ui.form.ComboTable(desc);
                    break;
                default:
                    throw new Error("Control '" + desc.type + "' is not yet supported");
                    break;
            }

            if (desc.copyForward) {
                control.setCopyForward(true);
            }
            if (desc.tooltip) {
                control.setToolTip(new qx.ui.tooltip.ToolTip(desc.tooltip));
            }
            if (desc.readOnly) {
                control.setEnabled(false);
            }
            if (desc.required) {
                control.setRequired(true);
            }
            if (desc.hasOwnProperty('width')) {
                control.setWidth(desc.width);
            }

            if (control.setFormDataCallback) {
                control.setFormDataCallback(desc.name, formDataCallback);
            }
            else if (control.getModel) {
                control.addListener('changeModel',function(e){
                    formDataCallback(desc.name, e.getData());
                },this);
            }
            else if (control.getModelSelection) {
                control.addListener('changeSelection', function(e) {
                    var selected = control.getModelSelection();
                    var value;
                    if (desc.type == "SelectBox") {
                        value = selected.toArray()[0];
                    }
                    else {
                        value = selected.toArray();
                    }
                    formDataCallback(desc.name, e.getData());
                },this);
            }
            else {
                control.addListener('changeValue', function(e) {
                    formDataCallback(desc.name, e.getData());
                },this);
            }
            return control;
        },

        /**
         * TODOC
         *
         * @param control {var} TODOC
         * @param data {var} TODOC
         * @return {void}
         */
        _addListItems : function(control, data) {
            var vtr = this._vtr;

            var len = data.length;
            for (var i=0; i<len; i++) {
                var item = data[i];

                if (qx.lang.Type.isObject(item)) {
                    var box = new qx.ui.form.ListItem(vtr(item.label));
                    box.setModel(item.model);
                    control.add(box);
                }
                else {
                    control.add(new qx.ui.form.ListItem(vtr(item)));
                }
            }
        },


        /**
         * TODOC
         *
         * @param control {var} TODOC
         * @param data {var} TODOC
         * @return {void}
         */
        _addCheckItems : function(control, data) {
            var vtr = this._vtr;
            var len = data.length;
            for (var i=0; i<len; i++) {
                var item = data[i];

                if (qx.lang.Type.isObject(item)) {
                    var box = new qx.ui.form.CheckBox(vtr(item.label));
                    box.setModel(item.model);
                    control.add(box);
                }
                else {
                    control.add(new qx.ui.form.CheckBox(vtr(item)));
                }
            }
        },


        /**
         * TODOC
         *
         * @param x {var} TODOC
         * @return {var} TODOC
         */
        _vtr : function(x) {
            var trans = qx.locale.Manager;
            return x.translate ? x : trans['tr'](x);
        }
    }
});
