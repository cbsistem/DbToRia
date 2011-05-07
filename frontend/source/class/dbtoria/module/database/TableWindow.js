/* ************************************************************************

  DbToRia - Database to Rich Internet Application

  http://www.dbtoria.org

   Copyright:
    2009 David Angleitner, Switzerland
    2011 Oetiker+Partner AG, Olten, Switzerland

   License:
    GPL: http://www.gnu.org/licenses/gpl-2.0.html

   Authors:
    * David Angleitner
    * Fritz Zaucker

************************************************************************ */

/*
 * TODOs:
 *   - show number of filtered rows in table legend, e.g.  x (y) rows
 *   - change appearance of filter button when filter active
 *   - perhaps integrate filter configuration into TableWindow instead of
 *     using a separate window
 */

/* ************************************************************************

#asset(dbtoria/*)
#asset(qx/icon/${qx.icontheme}/16/mimetypes/text-plain.png)
#asset(qx/icon/${qx.icontheme}/16/actions/contact-new.png)
#asset(qx/icon/${qx.icontheme}/16/actions/edit-delete.png)
#asset(qx/icon/${qx.icontheme}/16/actions/view-refresh.png)
#asset(qx/icon/${qx.icontheme}/16/actions/document-save-as.png)
#asset(qx/icon/${qx.icontheme}/16/actions/document-print.png)
#asset(qx/icon/${qx.icontheme}/16/actions/system-search.png)
#asset(qx/icon/${qx.icontheme}/16/actions/edit-copy.png)
#asset(qx/icon/${qx.icontheme}/16/apps/utilities-text-editor.png)

************************************************************************ */

/**
 * This class provides the view for a specific table.
 *
 * It displays a traditional table at first. On clicking on a row it opens a
 * form for data editing. This window also allows for searching, creation and
 * deletion of entries.
 */
qx.Class.define("dbtoria.module.database.TableWindow", {
    extend : dbtoria.module.desktop.Window,
    construct : function(tableId, tableName, viewMode, readOnly) {
        this.__tableName = tableName;
        this.__tableId   = tableId;
        this.__viewMode  = viewMode;
        this.__readOnly  = readOnly;

        this.base(arguments);
        this.set({
            contentPadding : 0,
            layout         : new qx.ui.layout.VBox().set({ separator: "separator-vertical"}),
            width          : 800,
            height         : 500,
            loading        : true
        });

        this.__rpc = dbtoria.data.Rpc.getInstance();
        this.__buildUi(tableId, viewMode, readOnly);
        if (viewMode) {
            this.setCaption(this.tr('View: %1', this.__tableName));
        }
        else {
            this.setCaption(this.tr('Table: %1', this.__tableName));
        }
        this.__recordEdit = new dbtoria.module.database.RecordEdit(tableId, tableName, readOnly);
        this.__recordEdit.addListener('navigation', this.__navigation, this);
        this.__recordEdit.addListener('refresh',    this.__refresh, this);

//        this.addListener('close', function() {
//            this.__recordEdit.cancel();
//        }, this);
        this.open();
    },

    members : {
        __table:      null,
        __tbEdit:     null,
        __tbDelete:   null,
        __tbClone:    null,
        __tbNew:      null,
        __currentId:  null,
        __tableName:  null,
        __tableId:    null,
        __columns:    null,
        __recordEdit: null,
        __rpc:        null,
        __dataChangedHandler:    null,
        __viewMode: null,
        __readOnly: null,

        close: function() {
            if (this.__viewMode || this.__readOnly ||
                !this.__recordEdit.isVisible()) {
                this.__recordEdit.close();
                this.base(arguments);
                return;
            }
            var mbox = dbtoria.ui.dialog.MsgBox.getInstance();
            mbox.info(this.tr('Unsaved data.'),
                      this.tr('You must first close the record edit window.'));
        },

        __refresh : function(e) {
            var tm = this.__table.getTableModel();
            if (this.__dataChangedHandler) {
                tm.removeListener('dataChanged', this.__dataChangedHandler, this);
                this.__dataChangedHandler = null;
            }

            // check if we still have a correct selection
            // FIX ME: it would be nicer to actually figure out which row to select.
            var sm        = this.__table.getSelectionModel();
            var selection = sm.getSelectedRanges()[0];
            if (selection == undefined || selection == null) {
                return;
            }
            var row = selection.minIndex;
            var that=this;
            this.__dataChangedHandler = function(e) {
                var id, rowData = tm.getRowData(row);
                if (rowData) { // we found the row
                    tm.removeListener('dataChanged', this.__dataChangedHandler, this);
                    this.__dataChangedHandler = null;
                    that.setLoading(false);
                    id = rowData['ROWINFO'][0];
                    if (id != this.__currentId) {
                        sm.resetSelection();
                    }
                }
            };

            tm.addListener('dataChanged', this.__dataChangedHandler, this);
            this.setLoading(true);
            tm.reloadData();
        },

        __navigation : function(e) {
            var target = e.getData();
            var sm     = this.__table.getSelectionModel();
            var tm     = this.__table.getTableModel();
            var selection = sm.getSelectedRanges()[0];
            var row;
            if (selection == undefined || selection == null) {
                row = 0; // FIX ME: is this sensible?
            }
            else {
                row    = selection.minIndex;
            }
            var oldRow = row;
            // switch record
            var maxRow = tm.getRowCount();
            this.debug('__navigation(): target='+target+', row='+row+', maxRow='+maxRow);
            switch (target) {
            case 'first':
                row = 0;
                break;
            case 'back':
                if (row>0) {
                    row--;
                }
                break;
            case 'next':
                if (row<maxRow-1) {
                    row++;
                }
                break;
            case 'last':
                row = maxRow-1;
                break;
            case 'new':
                this.__newRecord();
                return;
                break;
            }

            // switch
            if (row==oldRow) { // make sure there is a changeSelection event
                sm.resetSelection();
            }
            sm.setSelectionInterval(row, row);
            this.__table.scrollCellVisible(0, row);
            if (this.__recordEdit.isVisible()) {
                this.__editRecord(row);
            }

        },


        /**
         * Display a table overview with data
         *
         * @return {void}
         */
      __buildUi : function(tableId, viewMode, readOnly) {
            var toolbar = new qx.ui.toolbar.ToolBar();
            var newButton = this.__tbNew = new qx.ui.toolbar.Button(this.tr("New"), "icon/16/actions/contact-new.png");
            var editButton = this.__tbEdit = new qx.ui.toolbar.Button(this.tr("Edit"), "icon/16/apps/utilities-text-editor.png").set({enabled: false});
            var cloneButton = this.__tbClone = new qx.ui.toolbar.Button(this.tr("Clone"), "icon/16/actions/edit-copy.png").set({enabled: false});
            var deleteButton = this.__tbDelete = new qx.ui.toolbar.Button(this.tr("Delete"), "icon/16/actions/edit-delete.png").set({enabled: false});
            var refreshButton = new qx.ui.toolbar.Button(this.tr("Refresh"), "icon/16/actions/view-refresh.png");
            var exportButton = new qx.ui.toolbar.Button(this.tr("Export"), "icon/16/actions/document-save-as.png").set({enabled: false});
            var printButton = new qx.ui.toolbar.Button(this.tr("Print"), "icon/16/actions/document-print.png").set({enabled: false});
            var filterButton = new qx.ui.toolbar.CheckBox(this.tr("Search"), "icon/16/actions/system-search.png");

            if (readOnly) {
                editButton.setLabel(this.tr("Show"));
            }
            if (!viewMode && !readOnly) {
                newButton.addListener('execute', this.__newRecord, this);
                toolbar.add(newButton);
            }
            editButton.addListener('execute', this.__editRecord, this);
            toolbar.add(editButton);

            if (!viewMode && !readOnly) {
                cloneButton.addListener('execute', this.__cloneRecord, this);
                toolbar.add(cloneButton);

                deleteButton.addListener('execute', this.__deleteRecord, this);
                toolbar.add(deleteButton);
            }

            toolbar.addSpacer();

            refreshButton.addListener('execute', this.__refresh, this);
            toolbar.add(refreshButton);

            toolbar.add(exportButton);
            toolbar.add(printButton);

            filterButton.addListener('execute', qx.lang.Function.bind(this.__filterTable, this), this);
            toolbar.add(filterButton);

            this.add(toolbar);
            var that = this;
            this.__rpc.callAsyncSmart(function(ret){
                var columns = ret.columns;
                that.__columns = columns;
                var tableId = ret.tableId;
                var columnIds = [];
                var columnLabels = {};
                var i, nCols = columns.length;
                for (i=0; i<nCols; i++){
                    columnIds.push(columns[i].id);
                    columnLabels[columns[i].id] = columns[i].name;
                }
                var model = new dbtoria.data.RemoteTableModel(tableId,columnIds,columnLabels);
                that.__table = new dbtoria.ui.table.Table(model);
                if (!viewMode) {
                    that.__table.getSelectionModel().addListener('changeSelection',that.__switchRecord, that);
                    that.__table.addListener("cellDblclick", that.__editRecord, that);
                }
                for (i=0; i<nCols; i++){
                    that.__table.setContextMenuHandler(i, that.__contextMenuHandler, that);
                }
                that.add(that.__table, { flex : 1 });
                that.setLoading(false);
            },'getListView',tableId);
        },

        __contextMenuHandler: function(col, row, table, dataModel, contextMenu) {
            var editEntry   = new qx.ui.menu.Button(this.tr("Edit"));
            editEntry.addListener("execute", this.__editRecord, this);
            var deleteEntry = new qx.ui.menu.Button(this.tr("Delete"));
            deleteEntry.addListener("execute", this.__deleteRecord, this);
            var cloneEntry = new qx.ui.menu.Button(this.tr("Clone"));
            cloneEntry.addListener("execute", this.__cloneRecord, this);
            contextMenu.add(editEntry);
            contextMenu.add(deleteEntry);
            contextMenu.add(cloneEntry);

            return true;
        },


        __deleteRecord : function(e) {
            this.debug('__deleteRecord(): id='+this.__currentId);
            this.__rpc.callAsyncSmart(qx.lang.Function.bind(this.__deleteRecordHandler, this),
                                      'deleteTableData', this.__tableId, this.__currentId);
        },

        __deleteRecordHandler : function(ret) {
            var sm  = this.__table.getSelectionModel();
            var tm  = this.__table.getTableModel();
            var row = sm.getSelectedRanges()[0].minIndex;
            tm.removeRow(row);
            var rowInfo = tm.getRowData(row);
            this.__currentId = rowInfo['ROWINFO'][0];
        },

        __cloneRecordHandler: function(e) {
            var ret = e.getData();
            switch (ret) {
            case 'failed':
            case 'invalid':
                break;
            case 'succeeded':
                this.__refresh();
            case null:
                this.__recordEdit.cloneRecord(this.__currentId);
                break;
            }
        },

        __cloneRecord : function(e) {
            this.__recordEdit.addListenerOnce('saveRecord', this.__cloneRecordHandler, this);
            this.__recordEdit.saveRecord();
        },

        __editRecordHandler: function(e) {
            var ret = e.getData();
            switch (ret) {
            case 'failed':
            case 'invalid':
                break;
            case 'succeeded':
                this.__refresh();
            case null:
                this.__recordEdit.editRecord(this.__currentId);
                break;
            }
        },

        __editRecord : function(e) {
            this.debug('__editRecord called');
            this.__recordEdit.addListenerOnce('saveRecord',
                                              qx.lang.Function.bind(this.__editRecordHandler, this),
                                              this);
            this.__recordEdit.saveRecord();
        },

        __newRecordHandler: function(e) {
            var ret = e.getData();
            this.debug('__newRecordHandler(): ret='+ret);
            switch (ret) {
            case 'failed':
            case 'invalid':
                break;
            case 'succeeded':
                this.__refresh();
            case null:
                var sm = this.__table.getSelectionModel();
                sm.resetSelection();
                this.__recordEdit.newRecord();
                break;
            }
        },

        __newRecord : function(e) {
            this.__recordEdit.addListenerOnce('saveRecord', this.__newRecordHandler, this);
            this.__recordEdit.saveRecord();
        },

        __filterTable : function(e) {
            var that = this;
            new dbtoria.module.database.TableFilter(this.tr("Filter: %1", this.__tableName),
                                                    this.__columns,
                                                    function(filter) {
                                                        that.__table.getTableModel().setFilter(filter);
                                                    }
                                                   );
        },

        __switchRecord : function(e) {
            var table  = this.__table;
            var model  = table.getTableModel();
            var selMod = table.getSelectionModel();
            var tbBtn  = this.__tbBtn;
            var row;

            var currentRow, currentSelection = selMod.getSelectedRanges()[0];
            if (currentSelection != null && currentSelection != undefined) {
                currentRow = currentSelection.minIndex;
            }

            selMod.iterateSelection(function(ind) {
                row = model.getRowData(ind);
            });
            if (row) {
                this.__currentId = row.ROWINFO[0];
                this.__tbClone.setEnabled(row.ROWINFO[1]);
                this.__tbEdit.setEnabled(row.ROWINFO[1]);
                this.__tbDelete.setEnabled(row.ROWINFO[2]);
            }
            else {
                this.__tbClone.setEnabled(false);
                this.__tbDelete.setEnabled(false);
                this.__tbEdit.setEnabled(false);
                this.__currentId = null;
            }
            if (this.__recordEdit.isVisible() && this.__currentId != null) {
                this.__editRecord(this.__currentId);
            }
        }

    }
});
