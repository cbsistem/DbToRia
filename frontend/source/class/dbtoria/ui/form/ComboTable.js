/* ************************************************************************
   Copyright: 2009 OETIKER+PARTNER AG
   License:   GPLv3 or later
   Authors:   Tobi Oetiker <tobi@oetiker.ch>
              Fritz Zaucker <fritz.zaucker@oetiker.ch?
   Utf8Check: äöü
************************************************************************ */

/* ************************************************************************
************************************************************************ */

qx.Class.define("dbtoria.ui.form.ComboTable", {
    extend : combotable.ComboTable,

    /**
     * @param tableModel {} table model to use.
     *
     * Create a customized comboTable.
     *
     */
    construct : function(tableModel) {
        this.base(arguments, tableModel);
    },

    members : {
        setter: function(value) {
            if (value == null || value.id == undefined || value.id == null) {
                this.setModel(null);
                this.setValue(qx.locale.Manager.tr('Select'));
            }
            else {
                this.setModel(value.id);
                this.setValue(value.text);
            }
        },

        validator: function() {
            return function(value,control){
                        var msg = qx.locale.Manager.tr('This field must not be undefined.');
                        var valid = (value != qx.locale.Manager.tr('Select'));
                        if (!valid){
                            control.setInvalidMessage(msg);
                            control.setValid(valid);
                        }
                        return valid;
                   };
        }

    }

});
