/*!
 * ParamQuery Pro v10.1.0
 * 
 * Copyright (c) 2012-2024 Paramvir Dhindsa (http://paramquery.com)
 * Released under Commercial license
 * http://paramquery.com/pro/license
 * 
 */
if (typeof require == "function") {
	var jQuery = require("jquery-ui-pack"),
		pq = {},
		JSZip = require("jszip");
	module.exports = pq
} else {
	jQuery = window.jQuery;
	pq = window.pq = window.pq || {};
	JSZip = window.JSZip
}(function($) {
	var mixin = pq.mixin = {};
	mixin.render = {
		getRenderVal: function(objP, render, iGV) {
			var column = objP.column,
				cer = column.exportRender;
			if (render && cer !== false || cer) {
				return iGV.renderCell(objP)
			} else {
				return [objP.rowData[objP.dataIndx], ""]
			}
		},
		getTitle: function(cell, colIndx) {
			var title = cell.title;
			if (title != null) {
				if (pq.isFn(title)) {
					title = title.call(this.that, {
						colIndx: colIndx,
						column: cell,
						dataIndx: cell.dataIndx,
						Export: true
					})
				}
			} else {
				title = ""
			}
			return title
		}
	};
	mixin.GrpTree = {
		buildCache: function() {
			var self = this,
				o = self.that.options,
				isTree = self.isTree,
				data = isTree ? o.dataModel.data : self.that.pdata,
				cache = self.cache = {},
				id = self.id,
				rd, rId, i = 0,
				len = data.length;
			for (; i < len; i++) {
				rd = data[i];
				if (isTree || rd.pq_gtitle) {
					rId = rd[id];
					if (rId != null) {
						cache[rId] = rd
					} else {
						throw "unknown id of row"
					}
				}
			}
		},
		cascadeInit: function() {
			if (this.getCascadeInit()) {
				var self = this,
					arr = [],
					cbId = self.cbId,
					that = self.that,
					select = self.Model.select,
					data = that.pdata,
					rd, i = 0,
					len = data.length;
				for (; i < len; i++) {
					rd = data[i];
					if (rd[cbId]) {
						if (self.isEditable(rd)) {
							arr.push(rd);
							delete rd[cbId]
						} else if (select) {
							rd.pq_rowselect = true
						}
					} else if (rd[cbId] === null) {
						delete rd[cbId]
					}
				}
				if (arr.length) {
					self.checkNodes(arr, null, null, true)
				}
			}
		},
		cascadeNest: function(data) {
			var self = this,
				cbId = self.cbId,
				prop = self.prop,
				childstr = self.childstr,
				len = data.length,
				parentAffected, i = 0,
				rd, child;
			for (; i < len; i++) {
				rd = data[i];
				if (rd[prop]) {
					parentAffected = true;
					self.eachChild(rd, self.chkEachChild(cbId, rd[cbId], prop));
					delete rd[prop]
				}
				if ((child = rd[childstr]) && child.length) self.cascadeNest(child)
			}
			if (parentAffected && self.hasParent(rd)) {
				self.eachParent(rd, self.chkEachParent(cbId))
			}
		},
		checkAll: function(check, evt) {
			check = check == null ? true : check;
			var self = this,
				that = self.that;
			return self.checkNodes(that.pdata, check, evt, null, true)
		},
		checkNodes: function(arr, check, evt, init, all) {
			if (check == null) check = true;
			var rd, ri, i = 0,
				len = arr.length,
				rows = [],
				ui = {
					check: check
				},
				self = this,
				that = self.that,
				offset = that.riOffset,
				cbId = self.cbId,
				prop = self.prop,
				TM = self.Model,
				cascadeCheck = all ? false : self.isCascade(TM),
				fireEvent = init && TM.eventForInit || !init,
				ret, select = TM.select;
			for (; i < len; i++) {
				rd = arr[i];
				if (this.isEditable(rd)) {
					ri = rd.pq_ri;
					rows.push({
						rowData: rd,
						rowIndx: ri
					})
				}
			}
			ui.rows = rows;
			ui.dataIndx = self.colUI.dataIndx;
			if (init) ui.init = init;
			if (fireEvent) {
				ret = that._trigger("beforeCheck", evt, ui)
			}
			if (ret !== false) {
				rows = ui.rows;
				len = rows.length;
				if (len) {
					var chkRows = this.chkRows = [];
					for (i = 0; i < len; i++) {
						rd = rows[i].rowData;
						cascadeCheck && (rd[prop] = true);
						chkRows.push({
							rd: rd,
							val: check,
							oldVal: rd[cbId]
						});
						rd[cbId] = check
					}
					cascadeCheck && self.cascadeNest(self.getRoots());
					if (select) this.selectRows();
					if (cascadeCheck) {
						ui.getCascadeList = self.getCascadeList(self)
					}
					fireEvent && that._trigger("check", evt, ui);
					chkRows.length = 0
				}
			}
			self.setValCBox();
			if (!init) {
				that.refresh({
					header: false
				})
			}
		},
		chkEachChild: function(cbId, inpChk, prop) {
			return function(rd) {
				if (this.isEditable(rd)) {
					if (!prop || !rd[prop]) {
						var oldVal = rd[cbId];
						if (inpChk !== null && oldVal !== inpChk) {
							this.chkRows.push({
								rd: rd,
								val: inpChk,
								oldVal: oldVal
							});
							rd[cbId] = inpChk
						}
					}
				}
			}
		},
		chkEachParent: function(cbId) {
			var childstr = this.childstr;
			return function(rd) {
				if (this.isEditable(rd)) {
					var child = rd[childstr],
						countTrue = 0,
						countFalse = 0,
						oldVal = rd[cbId],
						rd2, chk, chk2;
					for (var i = 0, len = child.length; i < len; i++) {
						rd2 = child[i];
						if (this.isEditable(rd2)) {
							chk2 = rd2[cbId];
							if (chk2) {
								countTrue++
							} else if (chk2 === null) {
								chk = null;
								break
							} else {
								countFalse++
							}
							if (countTrue && countFalse) {
								chk = null;
								break
							}
						}
					}
					if (chk === undefined) {
						chk = countTrue ? true : false
					}
					if (oldVal !== chk) {
						this.chkRows.push({
							rd: rd,
							val: chk,
							oldVal: oldVal
						});
						rd[cbId] = chk
					}
				}
			}
		},
		eachChild: function(node, fn, parent) {
			fn.call(this, node, parent);
			var childstr = this.childstr,
				child = node[childstr] || [],
				rd, i = 0,
				len = child.length;
			for (; i < len; i++) {
				rd = child[i];
				if (rd[childstr]) {
					this.eachChild(rd, fn, node)
				} else {
					fn.call(this, rd, node)
				}
			}
		},
		eachParent: function(node, fn) {
			while (node = this.getParent(node)) {
				fn.call(this, node)
			}
		},
		_flatten: function(data, parentRD, level, data2) {
			var self = this,
				len = data.length,
				id = self.id,
				pId = self.parentId,
				i = 0,
				rd, child, childstr = self.childstr;
			for (; i < len; i++) {
				rd = data[i];
				rd.pq_level = level;
				data2.push(rd);
				if (parentRD) {
					rd[pId] = id ? parentRD[id] : parentRD
				}
				child = rd[childstr];
				if (child) {
					self._flatten(child, rd, level + 1, data2)
				}
			}
		},
		flatten: function(data) {
			var data2 = [];
			this._flatten(data, null, 0, data2);
			return data2
		},
		getUniqueNodes: function(nodes) {
			var nodes2 = [],
				cache = {},
				self = this,
				parentIdstr = self.parentId,
				idstr = self.id;
			nodes.forEach(function(node) {
				if (node[idstr] != null) cache[node[idstr]] = 1
			});
			nodes.forEach(function(node) {
				if (!cache[node[parentIdstr]]) nodes2.push(node)
			});
			return nodes2
		},
		getCascadeInit: function() {
			var ci = this._cascadeInit;
			this._cascadeInit = true;
			return ci
		},
		getLines: function(isFolder, rd, level, indent, left) {
			var style, parent, isSummary = rd.pq_gsummary,
				level = isSummary ? level + 1 : level,
				str = [],
				i = level;
			for (; i >= 1; i--) {
				style = left + ":" + i * indent + "px;width:" + indent + "px;";
				parent = this.getParent(rd);
				if (parent) {
					var siblings = this.getChildren(parent),
						isLastChild = siblings[siblings.length - 1] == rd,
						span1 = isLastChild && i < level || isSummary && i == level ? "" : "<span class='pq-tree-line-vert pq-border-0' style='" + style + (isLastChild && i == level && !isSummary ? "height:50%;" : "") + "'></span>",
						span2 = i < level || isSummary ? "" : "<span class='pq-tree-line-horz pq-border-0' style='" + style + (isFolder ? "width:" + indent * .25 + "px;" : "") + "'></span>";
					str.push(span1, span2);
					rd = parent
				}
			}
			return str.join("")
		},
		getNode: function(id) {
			return this.cache[id]
		},
		getParent: function(rd) {
			var pId = rd[this.parentId];
			return this.cache[pId]
		},
		fillState: function(obj) {
			var self = this,
				id, childstr = self.childstr,
				rd, cache = self.cache;
			for (id in cache) {
				rd = cache[id];
				if (rd[childstr]) obj[id] = rd.pq_close || false
			}
			return obj
		},
		hasParent: function(rd) {
			return rd[this.parentId] != null
		},
		getRoots: function(_data) {
			var that = this.that,
				data = _data || that.pdata || [],
				len = data.length,
				i = 0,
				rd, data2 = [];
			for (; i < len; i++) {
				rd = data[i];
				if (rd.pq_level === 0 && !rd.pq_gsummary) {
					data2.push(rd)
				}
			}
			if (len && !data2.length) {
				data2 = data
			}
			return data2
		},
		setCascadeInit: function(val) {
			this._cascadeInit = val
		},
		getCascadeList: function(self) {
			var list = [];
			return function() {
				if (!list.length) {
					var rows = self.chkRows,
						i = 0,
						cbId = self.cbId,
						len = rows.length;
					for (; i < len; i++) {
						var row = rows[i],
							rd = row.rd,
							ri = rd.pq_ri,
							newRow = {},
							oldRow = {};
						newRow[cbId] = row.val;
						oldRow[cbId] = row.oldVal;
						list.push({
							rowIndx: ri,
							rowData: rd,
							newRow: newRow,
							oldRow: oldRow
						})
					}
				}
				return list
			}
		},
		getChildren: function(node) {
			return (node ? node[this.childstr] : this.getRoots()) || []
		},
		getChildrenAll: function(rd, _data) {
			var childstr = this.childstr,
				nodes = rd[childstr] || [],
				len = nodes.length,
				i = 0,
				rd2, data = _data || [];
			for (; i < len; i++) {
				rd2 = nodes[i];
				data.push(rd2);
				if (rd2[childstr]) {
					this.getChildrenAll(rd2, data)
				}
			}
			return data
		},
		getSummary: function(node) {
			return node.pq_child_sum
		},
		isAncestor: function(rdChild, rdParent) {
			var rd = rdChild;
			while (rd = this.getParent(rd)) {
				if (rd == rdParent) {
					return true
				}
			}
		},
		isEmpty: function(node) {
			return !(node[this.childstr] || []).length
		},
		isCascade: function(model) {
			return model.cascade && model.checkbox && !model.maxCheck
		},
		isEditable: function(rd) {
			if (rd.pq_gsummary) {
				return false
			}
			var that = this.that,
				editable, col = this.colCB;
			if (col && (editable = col.editable) != null) {
				if (pq.isFn(editable)) {
					return editable.call(that, {
						rowData: rd
					})
				} else {
					return editable
				}
			} else {
				return true
			}
		},
		isFolder: function(rd) {
			return rd.pq_close != null || !!rd[this.childstr]
		},
		onCheckbox: function(self, TM) {
			return function(evt, ui) {
				if (TM.checkbox && self.colUI == ui.column) {
					self.checkNodes([ui.rowData], ui.input.checked, evt)
				}
			}
		},
		onCMInit: function() {
			var self = this,
				that = self.that,
				columns = that.columns,
				colUI, colCB, isTree = self.isTree,
				CM = that.colModel,
				firstCol, M = self.Model;
			if (M.titleInFirstCol && CM) {
				firstCol = CM.find(function(col) {
					return !col.hidden
				});
				M.titleIndx = firstCol.dataIndx = (firstCol.dataIndx == null ? Math.random() : firstCol.dataIndx).toString()
			}
			if (M.checkbox && columns) {
				colCB = columns[M.cbId] || {
					dataIndx: M.cbId
				};
				colCB.cb = {
					check: true,
					uncheck: false,
					select: M.select,
					header: M.checkboxHead,
					maxCheck: M.maxCheck
				};
				colUI = isTree ? columns[M.dataIndx] : columns[M.titleIndx]
			}
			self.colCB = colCB;
			self.colUI = colUI;
			if (columns && isTree) self.setCellRender()
		},
		onCustomSortTree: function(evt, ui) {
			var self = this,
				data = self.getRoots(ui.data);
			self.sort(data, ui.sort_composite);
			ui.data = self.flatten(data);
			return false
		},
		onRefresh: function(self, TM) {
			return function() {
				if (TM.checkbox) {
					var $inp = this.$cont.find(".pq_indeter"),
						i = $inp.length;
					while (i--) {
						$inp[i].indeterminate = true
					}
				}
			}
		},
		refreshView: function(source) {
			this.that.refreshView({
				header: false,
				source: source
			})
		},
		renderCB: function(checkbox, rd, cbId) {
			if (rd.pq_gsummary) {
				return ""
			}
			var that = this.that,
				checked = "",
				disabled = "",
				indeter = "",
				cls;
			if (pq.isFn(checkbox)) {
				checkbox = checkbox.call(that, rd)
			}
			if (checkbox) {
				rd[cbId] && (checked = "checked");
				if (!this.isEditable(rd)) {
					disabled = "disabled";
					cls = "pq_disable"
				}
				rd[cbId] === null && (indeter = "class='pq_indeter'");
				return ["<input type='checkbox' tabindex='-1' " + indeter + " " + checked + " " + disabled + "/>", cls]
			}
		},
		selectRows: function() {
			var i = 0,
				rows = this.chkRows,
				len = rows.length;
			for (; i < len; i++) {
				var row = rows[i],
					rd = row.rd,
					val = row.val;
				rd.pq_rowselect = val
			}
		},
		sort: function(_data, sort_composite) {
			var childstr = this.childstr,
				getSortComp = function() {
					return pq.isFn(sort_composite) ? sort_composite : sort_composite.shift()
				};
			(function _sort(data, sort_comp) {
				var len = data.length,
					i = 0,
					nodes;
				if (len) {
					if (sort_comp) data.sort(sort_comp);
					sort_comp = getSortComp();
					for (; i < len; i++) {
						if (nodes = data[i][childstr]) {
							_sort(nodes, sort_comp)
						}
					}
				}
			})(_data, getSortComp())
		},
		copyArray: function(arrD, arrS) {
			for (var i = 0, len = arrS.length; i < len; i++) {
				arrD.push(arrS[i])
			}
		},
		_summaryT: function(dataT, pdata, dxs, summaryTypes, columns, T, rdParent, isPivot, isGrandSummary) {
			var self = this,
				childstr = self.childstr,
				isGroup = self.isGroup,
				isTree = self.isTree,
				summaryInTitleRow = T.summaryInTitleRow,
				showSummary = T.showSummary,
				includeSingleSummary = !T.skipSingleSummary,
				titleIndx = T.titleIndx,
				i = 0,
				len = dataT.length,
				f = 0,
				cells = {},
				sumRow = {},
				sumRow2, rd, nodes, summaryType, dataIndx, id = self.id,
				parentId = self.parentId,
				diLevel = isGroup && rdParent ? T.dataIndx[rdParent.pq_level] : "",
				rows = [],
				dxsLen = dxs.length,
				_aggr = pq.aggregate;
			for (; f < dxsLen; f++) {
				dataIndx = dxs[f];
				cells[dataIndx] = []
			}
			for (; i < len; i++) {
				rd = dataT[i];
				sumRow2 = null;
				pdata.push(rd);
				if (nodes = rd[childstr]) {
					sumRow2 = self._summaryT(nodes, pdata, dxs, summaryTypes, columns, T, rd, isPivot);
					for (f = 0; f < dxsLen; f++) {
						dataIndx = dxs[f];
						self.copyArray(cells[dataIndx], sumRow2[1][dataIndx])
					}
					self.copyArray(rows, sumRow2[2])
				}
				if (isTree && (!summaryInTitleRow || !self.isFolder(rd)) || isGroup && !rd.pq_gtitle) {
					for (f = 0; f < dxsLen; f++) {
						dataIndx = dxs[f];
						cells[dataIndx].push(rd[dataIndx])
					}
					rows.push(rd)
				}
			}
			sumRow.pq_level = rdParent ? rdParent.pq_level : 0;
			if (isGrandSummary) {
				sumRow.pq_grandsummary = true
			}
			if (rdParent && (isTree && !summaryInTitleRow || isGroup && showSummary[rdParent.pq_level])) {
				sumRow[parentId] = rdParent[id];
				if (includeSingleSummary || len > 1) pdata.push(sumRow);
				else sumRow.pq_ghidden = true;
				rdParent.pq_child_sum = sumRow;
				sumRow.pq_hidden = rdParent.pq_close
			}
			for (f = 0; f < dxsLen; f++) {
				dataIndx = dxs[f];
				summaryType = summaryTypes[f];
				summaryType = summaryType[diLevel] || summaryType.type;
				if (summaryType == "count" && sumRow.pq_grandsummary && isPivot) {
					summaryType = "sum"
				}
				sumRow[dataIndx] = _aggr[summaryType](cells[dataIndx], columns[f], rows, sumRow);
				if (summaryInTitleRow && rdParent) {
					if (dataIndx != titleIndx) rdParent[dataIndx] = sumRow[dataIndx]
				}
			}
			sumRow.pq_gsummary = true;
			return [sumRow, cells, rows]
		},
		summaryT: function(isPivot) {
			var self = this,
				that = self.that,
				o = that.options,
				T = self.Model,
				roots = self.getRoots(),
				pdata = [],
				summaryTypes = [],
				dxs = [],
				columns = [],
				v = 0,
				column, summary, grandSumRow, CM = that.colModel,
				CMLength = CM.length;
			for (; v < CMLength; v++) {
				column = CM[v];
				summary = column.summary;
				if (summary && summary.type) {
					dxs.push(column.dataIndx);
					columns.push(column);
					summaryTypes.push(summary)
				}
			}
			grandSumRow = self._summaryT(roots, pdata, dxs, summaryTypes, columns, T, null, isPivot, true)[0];
			if (T.grandSummary) {
				self.summaryData = o.summaryData = [grandSumRow]
			} else {
				(self.summaryData || []).length = 0
			}
			that.pdata = pdata
		}
	}
})(jQuery);
(function($) {
	var mixin = pq.mixin,
		ISIE = true;
	$(document).one("pq:ready", function() {
		var $inp = $("<input type='checkbox' style='position:fixed;left:-50px;top:-50px;'/>").appendTo(document.body);
		$inp[0].indeterminate = true;
		$inp.on("change", function() {
			ISIE = false
		});
		$inp.click();
		$inp.remove()
	});
	mixin.ChkGrpTree = {
		onCellKeyDown: function(evt, ui) {
			var colUI = this.colUI,
				$inp;
			if (colUI && ui.dataIndx == colUI.dataIndx) {
				if (evt.keyCode == 32) {
					$inp = this.that.getCell(ui).find("input");
					$inp.click();
					return false
				}
			}
		},
		getCheckedNodes: function(all) {
			var that = this.that,
				data = all ? that.getData() : that.options.dataModel.data,
				len = data.length,
				i = 0,
				rd, arr = [],
				column = this.colCB || {},
				check = (column.cb || {}).check,
				cbId = column.dataIndx;
			if (cbId != null) {
				for (; i < len; i++) {
					rd = data[i];
					if (rd[cbId] === check) {
						arr.push(rd)
					}
				}
			}
			return arr
		},
		hasCboxHead: function() {
			return ((this.colCB || {}).cb || {}).header
		},
		isHeadChecked: function() {
			return this.inpVal
		},
		onBeforeCheck: function(evt, ui) {
			if (ui.check && this.colCB) {
				var colCB = this.colCB,
					cb = colCB.cb,
					select = cb.select,
					maxCheck = cb.maxCheck;
				if (maxCheck && this.colUI.dataIndx == ui.dataIndx) {
					var ul = ui.rows.slice(0, maxCheck),
						toCheck = ul.length,
						di = colCB.dataIndx,
						nodes = this.getCheckedNodes(true),
						toUncheck = toCheck + nodes.length - maxCheck;
					if (toUncheck > 0) {
						nodes.slice(0, toUncheck).forEach(function(rd) {
							rd[di] = cb.uncheck;
							if (select) {
								delete rd.pq_rowselect
							}
						})
					}
					ui.rows = ul
				}
			}
		},
		onHeaderChange: function(evt) {
			if (this.checkAll(evt.target.checked, evt) === false) {
				this.refreshHeadVal()
			}
		},
		onRefreshHeader: function() {
			var self = this,
				that = self.that;
			if (self.hasCboxHead()) {
				if (self.model == "groupModel" && !that.options[self.model].on) {
					return
				}
				var $td = that.getCellHeader({
						dataIndx: self.colUI.dataIndx
					}),
					$inp = $td.find("input");
				if (!$inp.length) {
					$td.find(".pq-title-span").prepend('<input type="checkbox" tabindex="-1" />');
					$inp = $td.find("input")
				}
				if (!self.$inp || $inp[0] != self.$inp[0]) {
					self.$inp = $inp;
					self.refreshHeadVal();
					if (ISIE) {
						$inp.on("click", function(evt) {
							if ($inp.data("pq_value") == null) {
								$inp[0].checked = true;
								$inp.data("pq_value", true);
								self.onHeaderChange(evt)
							}
						})
					}
					$inp.on("change", function(evt) {
						self.onHeaderChange(evt)
					})
				}
			}
		},
		refreshHeadVal: function() {
			if (this.$inp) this.$inp.pqval({
				val: this.inpVal
			})
		},
		setValCBox: function() {
			if (!this.hasCboxHead()) {
				return
			}
			var that = this.that,
				options = that.options,
				col = this.colCB,
				di = col.dataIndx,
				ci = that.colIndxs[di],
				cb = col.cb,
				cbAll = cb.all,
				remotePage = options.pageModel.type == "remote",
				offset = remotePage || !cbAll ? that.riOffset : 0,
				data = cbAll ? options.dataModel.data : that.pdata,
				val = null,
				selFound = 0,
				rd, ri, rows = 0,
				unSelFound = 0;
			if (data) {
				var i = 0,
					len = data.length;
				for (; i < len; i++) {
					rd = data[i];
					if (rd) {
						ri = i + offset;
						if (!rd.pq_gsummary && !rd.pq_gtitle && this.isEditable(rd, col, ri, ci, di, i)) {
							rows++;
							if (rd[di] === cb.check) {
								selFound++
							} else {
								unSelFound++
							}
						}
					}
				}
				if (selFound == rows && rows) {
					val = true
				} else if (unSelFound == rows) {
					val = false
				}
				this.inpVal = val;
				this.refreshHeadVal()
			}
		},
		unCheckAll: function() {
			this.checkAll(false)
		},
		unCheckNodes: function(arr, evt) {
			this.checkNodes(arr, false, evt)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery = $.paramquery || {};
	var handleListeners = function(that, arg_listeners, evt, data) {
		var listeners = arg_listeners.slice(),
			i = 0,
			len = listeners.length,
			ret, removals = [];
		for (; i < len; i++) {
			var listener = listeners[i],
				cb = listener.cb,
				one = listener.one;
			if (one) {
				if (listener._oncerun) {
					continue
				}
				listener._oncerun = true
			}
			ret = cb.call(that, evt, data);
			if (ret === false) {
				evt.preventDefault();
				evt.stopPropagation()
			}
			if (one) {
				removals.push(i)
			}
			if (evt.isImmediatePropagationStopped()) {
				break
			}
		}
		if (len = removals.length) {
			for (i = len - 1; i >= 0; i--) {
				listeners.splice(removals[i], 1)
			}
		}
	};
	_pq._trigger = function(type, evt, data) {
		var self = this,
			prop, orig, this_listeners = self.listeners,
			listeners = this_listeners[type],
			o = self.options,
			allEvents = o.allEvents,
			bubble = o.bubble,
			$ele = self.element,
			callback = o[type];
		data = data || {};
		evt = $.Event(evt);
		evt.type = self.widgetName + ":" + type;
		evt.target = $ele[0];
		orig = evt.originalEvent;
		if (orig) {
			for (prop in orig) {
				if (!(prop in evt)) {
					evt[prop] = orig[prop]
				}
			}
		}
		if (allEvents) {
			if (pq.isFn(allEvents)) {
				allEvents.call(self, evt, data)
			}
		}
		if (listeners && listeners.length) {
			handleListeners(self, listeners, evt, data);
			if (evt.isImmediatePropagationStopped()) {
				return !evt.isDefaultPrevented()
			}
		}
		if (o.trigger) {
			$ele[bubble ? "trigger" : "triggerHandler"](evt, data);
			if (evt.isImmediatePropagationStopped()) {
				return !evt.isDefaultPrevented()
			}
		}
		if (callback) {
			var ret = callback.call(self, evt, data);
			if (ret === false) {
				evt.preventDefault();
				evt.stopPropagation()
			}
		}
		listeners = this_listeners[type + "Done"];
		if (listeners && listeners.length) {
			handleListeners(self, listeners, evt, data)
		}
		return !evt.isDefaultPrevented()
	};
	var event_on = function(that, type, cb, one, first) {
		var listeners = that.listeners[type];
		if (!listeners) {
			listeners = that.listeners[type] = []
		}
		listeners[first ? "unshift" : "push"]({
			cb: cb,
			one: one
		})
	};
	_pq.on = function() {
		var arg = arguments;
		if (typeof arg[0] == "boolean") {
			var first = arg[0],
				type = arg[1],
				cb = arg[2],
				one = arg[3]
		} else {
			var type = arg[0],
				cb = arg[1],
				one = arg[2]
		}
		var arr = type.split(" ");
		for (var i = 0; i < arr.length; i++) {
			var _type = arr[i];
			if (_type) {
				event_on(this, _type, cb, one, first)
			}
		}
		return this
	};
	_pq.one = function() {
		var len = arguments.length,
			arr = [];
		for (var i = 0; i < len; i++) {
			arr[i] = arguments[i]
		}
		arr[len] = true;
		return this.on.apply(this, arr)
	};
	var event_off = function(that, evtName, cb) {
		if (cb) {
			var listeners = that.listeners[evtName];
			if (listeners) {
				var removals = [];
				for (var i = 0, len = listeners.length; i < len; i++) {
					var listener = listeners[i],
						cb2 = listener.cb;
					if (cb == cb2) {
						removals.push(i)
					}
				}
				if (removals.length) {
					for (var i = removals.length - 1; i >= 0; i--) {
						listeners.splice(removals[i], 1)
					}
				}
			}
		} else {
			delete that.listeners[evtName]
		}
	};
	_pq.off = function(type, cb) {
		var arr = type.split(" ");
		for (var i = 0; i < arr.length; i++) {
			var _type = arr[i];
			if (_type) {
				event_off(this, _type, cb)
			}
		}
		return this
	};
	$.widget("paramquery.pqTooltip", $.ui.tooltip, {
		options: {
			items: ".pq-grid-cell.pq-has-tooltip,.pq-grid-cell[title]",
			position: {
				my: "center top",
				at: "center bottom"
			},
			content: function() {
				var $td = $(this),
					$grid = $td.closest(".pq-grid"),
					grid = $grid.pqGrid("instance"),
					pq_valid, obj = grid.getCellIndices({
						$td: $td
					});
				obj.data = "pq_valid";
				pq_valid = grid.data(obj).data;
				if (pq_valid) {
					var icon = pq_valid.icon,
						strIcon = icon == "" ? "" : "<span class='ui-icon " + icon + " pq-tooltip-icon'></span>",
						title = pq_valid.msg;
					return strIcon + (title != null ? title : "")
				} else {
					return $td.attr("title")
				}
			}
		},
		_create: function() {
			this._super();
			var $ele = this.element,
				grid = $ele.pqGrid("instance"),
				eventNamespace = this.eventNamespace;
			grid.on("change", function() {
				grid.one("refresh", function() {
					grid.getCell(grid.getFocus()).trigger("focusin")
				})
			});
			$ele.on("pqtooltipopen" + eventNamespace, function(evt, ui) {
				var $grid = $(evt.target),
					$td = $(evt.originalEvent.target);
				$td.on("remove.pqtt", function(evt) {
					$grid.pqTooltip("close", evt, true)
				});
				if ($grid.is(".pq-grid")) {
					var obj = grid.getCellIndices({
							$td: $td
						}),
						pq_valid;
					obj.data = "pq_valid";
					pq_valid = grid.data(obj).data;
					if (pq_valid) {
						var style = pq_valid.style,
							cls = pq_valid.cls,
							oldstyle, tt = ui.tooltip;
						tt.addClass(cls);
						oldstyle = tt.attr("style");
						tt.attr("style", oldstyle + ";" + style)
					}
				}
			}).on("pqtooltipclose" + eventNamespace, function(evt, ui) {
				var $td = $(evt.originalEvent.target);
				$td.off(".pqtt")
			})
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		_proto_ = Array.prototype;
	!_proto_.find && (_proto_.find = function(fn, context) {
		for (var i = 0, len = this.length, item; i < len; i++) {
			item = this[i];
			if (fn.call(context, item, i, this)) {
				return item
			}
		}
	});
	!_proto_.findIndex && (_proto_.findIndex = function(fn, context) {
		for (var i = 0, len = this.length, item; i < len; i++) {
			item = this[i];
			if (fn.call(context, item, i, this)) {
				return i
			}
		}
		return -1
	});
	$.extend(pq, {
		_hw: function($ele, HW, top, bottom) {
			var ele = $ele[0],
				border = "border-",
				padding = "padding-",
				width = "-width";
			return ele["offset" + HW] - [border + top + width, border + bottom + width, padding + top, padding + bottom].reduce(function(val, item) {
				return val + (parseInt($ele.css(item)) || 0)
			}, 0)
		},
		height: function($ele) {
			return this._hw($ele, "Height", "top", "bottom")
		},
		width: function($ele) {
			return this._hw($ele, "Width", "left", "right")
		},
		position: function($ele, ui) {
			function norm(val) {
				var arr = val.split(" ");
				if (val == "center") arr = [val, val];
				else if (val == "top" || val == "bottom") arr = ["center", val];
				else if (val == "left" || val == "right") arr = [val, "center"];
				arr.forEach((val, i) => {
					var m, offset = 0;
					if (m = val.match(/([a-z]+)(\+|-)([\d]+)(\%?)/)) {
						arr[i] = m[1];
						offset = m[2] + m[3];
						offset = m[4] ? offset + "%" : offset * 1
					}
					arr[2 + i] = offset
				});
				return arr
			}
			var of = ui.of, myArr = norm(ui.my || "center"), atArr = norm(ui.at || "center"), atX = atArr[0], atY = atArr[1], atOffsetX = atArr[2], atOffsetY = atArr[3], myX = myArr[0], myY = myArr[1], myOffsetX = myArr[2], myOffsetY = myArr[3], isEvt = of.pageX != null, target = (of.originalEvent || of).target || of [0] || of, ele = $ele[0], eleRect = ele.getBoundingClientRect(), eleWd = eleRect.width, eleHt = eleRect.height, targetRect = target.getBoundingClientRect(), targetWd = targetRect.width, targetHt = targetRect.height, getOffset = (x, dim) => x * 1 == x ? x : parseInt(x) * dim / 100, myOffsetX = getOffset(myOffsetX, eleWd), myOffsetY = getOffset(myOffsetY, eleHt), atOffsetX = getOffset(atOffsetX, targetWd), atOffsetY = getOffset(atOffsetY, targetHt), targetLeft = targetRect.left, targetTop = targetRect.top, parent = ele.parentNode, body = document.body, isParentBody = parent == body, parentRect = parent.getBoundingClientRect(), parentLeft = isParentBody ? 0 : parentRect.left, parentTop = isParentBody ? 0 : parentRect.top, scaleB = pq.getScale(parent), scaleBX = scaleB[0], scaleBY = scaleB[1], scaleT = pq.getScale(target), scaleTX = scaleT[0], scaleTY = scaleT[1], offsetObjX = {
				left: 0,
				center: .5,
				right: 1
			}, offsetObjY = {
				top: 0,
				center: .5,
				bottom: 1
			}, offsetX = isEvt ? of.offsetX * scaleTX : offsetObjX[atX] * targetWd - offsetObjX[myX] * eleWd, offsetY = isEvt ? of.offsetY * scaleTY : offsetObjY[atY] * targetHt - offsetObjY[myY] * eleHt, left = targetLeft + offsetX - parentLeft, top = targetTop + offsetY - parentTop, left = left + (atOffsetX - myOffsetX), top = top + (atOffsetY - myOffsetY), win = window, winWd = $(win).width(), winHt = $(win).height(), dx = left + eleWd + parentLeft - winWd, dy = top + eleHt + parentTop - winHt;
			left -= dx > 0 ? dx : 0;
			top -= dy > 0 ? dy : 0;
			left = left + parentLeft < 0 ? -parentLeft : left;
			top = top + parentTop < 0 ? -parentTop : top;
			if (isParentBody) {
				left += win.scrollX;
				top += win.scrollY
			}
			$ele.css({
				left: left / scaleBX,
				top: top / scaleBY
			})
		},
		addDefault(target, source) {
			var self = this,
				key, val, descriptor;
			for (key in source) {
				val = source[key], descriptor = Object.getOwnPropertyDescriptor(source, key);
				if (typeof val === "object") {
					if (val instanceof Array) {
						if (target[key] == undefined) target[key] = val
					} else {
						target[key] = target[key] || {};
						self.addDefault(target[key], val)
					}
				} else if (descriptor.get || descriptor.set) {
					Object.defineProperty(target, key, descriptor)
				} else if (target[key] == undefined) {
					target[key] = val
				}
			}
			return target
		},
		arrayUnique: function(arr, key) {
			var newarr = [],
				i, len = arr.length,
				str, obj = {},
				key2;
			for (i = 0; i < len; i++) {
				str = arr[i];
				key2 = key ? str[key] : str;
				if (obj[key2] == 1) {
					continue
				}
				obj[key2] = 1;
				newarr.push(str)
			}
			return newarr
		},
		cap1: function(str) {
			return str && str.length ? str[0].toUpperCase() + str.slice(1) : ""
		},
		elementFromXY: function(evt) {
			var x = evt.clientX,
				y = evt.clientY,
				$ele = $(document.elementFromPoint(x, y)),
				$e2;
			if ($ele.closest(".ui-draggable-dragging").length) {
				$e2 = $ele;
				$e2.hide();
				$ele = $(document.elementFromPoint(x, y));
				$e2.show()
			}
			return $ele
		},
		getFocusEle: function(prev, parent) {
			var selector = ["a", "textarea", "button", "input", "select", "[tabindex]", "div[contenteditable]"].map(function(ele) {
					return ele + ':not([disabled],[tabindex="-1"])'
				}).join(","),
				activeElement = document.activeElement,
				$ae = $(activeElement);
			parent = parent || document.body;
			if (activeElement) {
				var focussable = [].filter.call($(parent).find(selector), function(element) {
						return (element.offsetWidth > 0 || element.offsetHeight > 0 || element == activeElement) && element.className.indexOf("pq-box-focus") == -1
					}),
					index = focussable.indexOf(activeElement);
				if (index == -1) index = focussable.indexOf($ae.closest("[tabindex=0]")[0]);
				if (index > -1) return prev ? focussable[index - 1] : focussable[index + 1];
				else return prev ? focussable[focussable.length - 1] : focussable[0]
			}
		},
		focusEle: function(prev, parent) {
			var ele = this.getFocusEle(prev, parent);
			if (ele) $(ele).focus();
			return ele
		},
		escapeHtml: function(val) {
			return val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		},
		juiToExcel: function() {
			var cache = {};
			return function(format) {
				var f = cache[format];
				if (!f && typeof format == "string") {
					f = format.replace(/y/g, "yy").replace(/DD/g, "dddd").replace(/D/g, "ddd").replace(/MM/g, "mmmm").replace(/M/g, "mmm");
					cache[format] = f
				}
				return f || ""
			}
		}(),
		excelToJui: function() {
			var cache = {};
			return function(format) {
				var f = cache[format];
				if (!f && typeof format == "string") {
					f = format.replace(/yy/g, "y").replace(/dddd/g, "DD").replace(/ddd/g, "D").replace(/mmmm/g, "MM").replace(/mmm/g, "M");
					cache[format] = f
				}
				return f || ""
			}
		}(),
		mergeDeep: function(target, source) {
			var key, valSrc, valTarget;
			for (key in source) {
				valSrc = source[key];
				valTarget = target[key];
				if ($.isPlainObject(valSrc) && $.isPlainObject(valTarget)) {
					pq.mergeDeep(valTarget, valSrc)
				} else {
					target[key] = valSrc
				}
			}
		},
		offset: function(ele, uptoEle) {
			var left = 0,
				top = 0;
			do {
				if (ele == uptoEle) {
					break
				}
				left += ele.offsetLeft - ele.scrollLeft;
				top += ele.offsetTop - ele.scrollTop
			} while (ele = ele.offsetParent);
			return {
				left: left,
				top: top
			}
		},
		inherit: function(base, sub, methods) {
			var fn = function() {};
			fn.prototype = base.prototype;
			var _p = sub.prototype = new fn,
				_bp = base.prototype,
				method;
			for (method in methods) {
				var _bpm = _bp[method],
					_spm = methods[method];
				if (_bpm) {
					_p[method] = function(_bpm, _spm) {
						return function() {
							var old_super = this._super,
								ret;
							this._super = function() {
								return _bpm.apply(this, arguments)
							};
							ret = _spm.apply(this, arguments);
							this._super = old_super;
							return ret
						}
					}(_bpm, _spm)
				} else {
					_p[method] = _spm
				}
			}
			_p.constructor = sub;
			_p._base = base;
			_p._bp = function(method) {
				var args = arguments;
				Array.prototype.shift.call(args);
				return _bp[method].apply(this, args)
			}
		},
		copyObj: function(objTarget, objSrc, arrExclude) {
			var key, val, propsExclude = pq.objectify(arrExclude);
			for (key in objSrc) {
				if (!propsExclude[key]) {
					val = objSrc[key];
					objTarget[key] = $.isPlainObject(val) ? $.extend(true, {}, val) : val
				}
			}
			return objTarget
		},
		exportCsv: function(header, body, obj) {
			obj = obj || {};
			var csvRows = [],
				csvRow, title, separator = obj.separator || ",";

			function fn(rows) {
				rows.forEach(function(row) {
					csvRow = [];
					row.cells.forEach(function(cell) {
						title = cell.text;
						title = title == null ? "" : title;
						title = (title + "").replace(/\"/g, '""');
						csvRow.push('"' + title + '"')
					});
					csvRows.push(csvRow.join(separator))
				})
			}
			fn(header);
			fn(body);
			return (obj.skipBOM ? "" : "\ufeff") + csvRows.join("\n")
		},
		exportHtm: function(header, body, obj) {
			var that = obj.grid,
				rtl = that.options.rtl,
				dircss = rtl ? "direction:rtl;" : "",
				$tbl = that.element.find(".pq-table"),
				fontFamily = $tbl.css("font-family"),
				fontSize = $tbl.css("font-size"),
				cssRules = "td,th{padding: 5px;}" + (obj.cssRules || ""),
				cssTable = "empty-cells:show;font-family:" + fontFamily + ";font-size:" + fontSize + ";border-spacing:0;" + dircss + (obj.cssTable || ""),
				response = [];

			function fn(rows, isHead) {
				if (isHead) response.push("<thead>");
				rows.forEach(function(row) {
					var attr = [],
						tmp;
					if (tmp = row.attr) attr.push(tmp);
					if (tmp = row.css) attr.push("style='" + pq.styleStr(tmp) + "'");
					attr = attr.length ? " " + attr.join(" ") : "";
					response.push("<tr", attr, ">");
					row.cells.forEach(function(cell) {
						if (!cell.empty) {
							var text = cell.html || cell.text,
								css = "",
								attr = [];
							if (tmp = cell.colSpan) attr.push("colspan=" + tmp);
							if (tmp = cell.rowSpan) attr.push("rowspan=" + tmp);
							if (tmp = cell.alignment) css += "text-align:" + tmp + ";";
							if (tmp = cell.valign) css += "vertical-align:" + (tmp == "center" ? "middle" : tmp) + ";";
							if (tmp = cell.css) css += pq.styleStr(tmp);
							if (css) attr.push("style='" + css + "'");
							attr = attr.length ? " " + attr.join(" ") : "";
							if (isHead) response.push("<th", attr, ">", text, "</th>");
							else response.push("<td", attr, ">", pq.newLine(text), "</td>")
						}
					});
					response.push("</tr>")
				});
				if (isHead) response.push("</thead>")
			}
			response.push("<style>" + cssRules + "</style>");
			response.push("<table class='pq-export-table' style='" + cssTable + "'>");
			if (header.length) fn(header, true);
			fn(body);
			response.push("</table>");
			return response.join("")
		},
		borderP: ["left", "top", "right", "bottom"],
		getPdfStyle: function(cell, s) {
			var tmp, b, c = function(prop, val) {
				if (cell[prop] == null) cell[prop] = val
			};
			if (tmp = s["background-color"]) c("fillColor", tmp);
			if (tmp = s["font-size"]) c("fontSize", parseFloat(tmp));
			if (tmp = s.color) c("color", tmp);
			if (tmp = s["font-weight"]) c("bold", tmp == "bold");
			if (tmp = s["white-space"]) c("noWrap", tmp == "nowrap");
			if (tmp = s["font-style"]) c("italics", tmp == "italic");
			if (tmp = s["text-decoration"]) {
				tmp = pq.camelCase(tmp);
				if (["underline", "lineThrough", "overline"].indexOf(tmp) >= 0) c("decoration", tmp)
			}
			pq.borderP.forEach(function(loc, indx) {
				if (tmp = s["border-" + loc]) {
					b = cell.borderColor = cell.borderColor || [];
					if (!b[indx]) {
						b[indx] = tmp.split(" ")[2]
					}
				}
			});
			cell.border = cell.borderColor
		},
		exportPdf: function(header, rows) {
			var self = this,
				rowcss, hLen = header.length,
				noCols = hLen ? header[0].cells.length : rows[0] ? rows[0].cells.length : 0,
				i, cells, cells2, cell, body = [];

			function fn(rows) {
				rows.forEach(function(row) {
					if (rowcss = row.css) rowcss = pq.styleObj(rowcss);
					cells = row.cells;
					cells2 = [];
					for (i = 0; i < noCols; i++) {
						cell = cells[i] || {};
						if (cell.css) {
							self.getPdfStyle(cell, pq.styleObj(cell.css))
						}
						if (rowcss) self.getPdfStyle(cell, rowcss);
						cells2[i] = cell
					}
					body.push(cells2)
				})
			}
			fn(header);
			fn(rows);
			return {
				body: body,
				headerRows: hLen
			}
		},
		extendT: function(objTarget, objSrc) {
			var key, val, descriptor;
			for (key in objSrc) {
				if (objTarget[key] === undefined) {
					descriptor = Object.getOwnPropertyDescriptor(objSrc, key);
					if (descriptor.get || descriptor.set) {
						Object.defineProperty(objTarget, key, descriptor);
						continue
					}
					val = objSrc[key];
					objTarget[key] = val && typeof val == "object" ? $.extend(true, {}, val) : val
				}
			}
			return objTarget
		},
		flatten: function(arr, arr2) {
			var i = 0,
				len = arr.length,
				val;
			arr2 = arr2 || [];
			for (; i < len; i++) {
				val = arr[i];
				if (val != null) {
					if (val.push) {
						pq.flatten(val, arr2)
					} else {
						arr2.push(val)
					}
				}
			}
			return arr2
		},
		toRC: function(part) {
			var arr = part.match(/([A-Z]*)(\d*)/),
				c = pq.toNumber(arr[1]),
				r;
			if (arr[2]) r = arr[2] - 1;
			return [r, c]
		},
		pad: function(val) {
			val = val + "";
			return val.length == 1 ? "0" + val : val
		},
		getDataTypeFromVal(val) {
			if (val != null) {
				var type = typeof val;
				if (type == "number") {
					return "Number"
				}
				if (type == "string") {
					if (parseFloat(val) == val) {
						return "Number"
					}
					if (pq.testFmtDate(val, ["yyyy-mm-dd ", "mm/dd/yyyy"])) {
						return "Date"
					}
				}
			}
		},
		onResize: function(ele, fn) {
			if (ele.attachEvent) ele.attachEvent("onresize", fn);
			else if (window.ResizeObserver) new window.ResizeObserver(fn).observe(ele);
			else if (window.addResizeListener) window.addResizeListener(ele, fn);
			else $(ele).resize(fn)
		},
		fileRead: function(file, type, fn) {
			var reader = new FileReader;
			reader[type](file);
			reader.onload = function() {
				fn(reader.result)
			}
		},
		fileToBase: function(file, fn) {
			pq.fileRead(file, "readAsDataURL", fn)
		},
		xmlhttp: function(url, responseType, fn) {
			var xhr = new XMLHttpRequest;
			xhr.onload = function() {
				fn(xhr.response)
			};
			xhr.open("GET", url);
			xhr.responseType = responseType;
			xhr.send()
		},
		urlToBase: function(url, fn) {
			pq.xmlhttp(url, "blob", function(response) {
				pq.fileToBase(response, fn)
			})
		},
		objectAttr: function(attr) {
			if (attr) {
				attr = attr.split(" ")
			}
		},
		fakeEvent: function($ele, event, timeout) {
			if (event == "timeout") {
				var to, evtName = "input change";
				$ele.off(evtName).on(evtName, function() {
					clearTimeout(to);
					to = setTimeout(function() {
						$ele.triggerHandler("timeout")
					}, timeout)
				})
			}
		},
		getScript: function(file, callback) {
			if ($('script[src="' + file + '"]').length) {
				callback()
			} else {
				var script = document.createElement("script");
				script.onload = callback;
				script.src = file;
				document.head.appendChild(script)
			}
		},
		getScripts: function(files, callback, indx) {
			indx = indx || 0;
			pq.getScript(files[indx], function() {
				if (++indx == files.length) callback();
				else {
					pq.getScripts(files, callback, indx)
				}
			})
		},
		getAddress: function(addr) {
			var parts = addr.split(":"),
				part1 = this.toRC(parts[0]),
				r1 = part1[0],
				c1 = part1[1],
				part2 = this.toRC(parts[1] || parts[0]),
				r2 = part2[0],
				c2 = part2[1],
				rc, cc;
			if (!isNaN(r2)) rc = r2 - r1 + 1;
			if (!isNaN(c2)) cc = c2 - c1 + 1;
			return {
				r1: r1,
				c1: c1,
				rc: rc,
				cc: cc,
				r2: r2,
				c2: c2
			}
		},
		getClsVal: function(cls, str) {
			var match = cls.match(new RegExp("\\b" + str + "(\\S+)\\b"));
			return match ? match[1] : null
		},
		getDataType: function(column) {
			var dt = column.dataType;
			if (dt == "float" || dt == "integer") dt = "number";
			return dt || "string"
		},
		getFn: function() {
			var obj = {};
			return function(cb) {
				var fn = cb;
				if (pq.isStr(cb)) {
					if (!(fn = obj[cb])) {
						fn = window;
						cb.split(".").forEach(function(part) {
							fn = fn[part]
						});
						obj[cb] = fn
					}
				}
				return fn
			}
		}(),
		isLink: function(str) {
			return (str + "").match(/^<a\s+href=(?:"([^"]+)"|'([^']+)').*?>(.*?)<\/a>$/)
		},
		isFn: function(fn) {
			return typeof fn == "function"
		},
		isStr: function(fn) {
			return typeof(fn != null ? fn.valueOf() : fn) == "string"
		},
		isCtrl: function(evt) {
			return evt.ctrlKey || evt.metaKey
		},
		isEmpty: function(obj) {
			for (var key in obj) {
				return false
			}
			return true
		},
		isObject: function(obj) {
			return Object.prototype.toString.call(obj) === "[object Object]"
		},
		getScale(ele) {
			var rect = ele.getBoundingClientRect();
			return [rect.width / ele.offsetWidth || 1, rect.height / ele.offsetHeight || 1]
		},
		makePopup: function(popup, ele, ui) {
			var rand = (Math.random() + "").replace(".", ""),
				onPopupRemove = ui.onPopupRemove,
				noCloseSelector = ui.noCloseSelector,
				keepPopupWithoutEle = ui.keepPopupWithoutEle,
				closeOnEle = ui.closeOnEle,
				scale = pq.getScale(ele),
				scaleP = pq.getScale(popup.parentNode),
				evt = "mousedown.pq" + rand,
				nodeName = (ele.nodeName || "").toLowerCase(),
				canSafe = nodeName == "input" || nodeName == "textarea",
				close = function(safe) {
					if (safe && canSafe && document.body.contains(ele)) $popup.hide();
					else {
						$popup.remove()
					}
				},
				$popup = $(popup);
			$popup.css({
				scale: scale[0] / scaleP[0] + " " + scale[1] / scaleP[1],
				"transform-origin": "0 0"
			});
			$popup.addClass("pq-popup").on("keydown", function(evt) {
				if (evt.keyCode == $.ui.keyCode.ESCAPE && !evt.isDefaultPrevented()) {
					close(true);
					if (ele && document.contains(ele)) ele.focus()
				}
			});
			keepPopupWithoutEle || $(ele).one("remove", function() {
				close()
			});
			$popup.one("remove", function() {
				$(document).off(evt);
				if (onPopupRemove) onPopupRemove()
			});
			requestAnimationFrame(function() {
				$(document).on(evt, function(evt) {
					var t = evt.target,
						$t = $(t);
					if ($popup.is(":visible") && !popup.contains(t) && !pq.isCtrl(evt) && !$t.closest(".ui-datepicker").length && (!noCloseSelector || !$t.closest(noCloseSelector).length) && (closeOnEle || !ele.contains(t))) {
						close(true)
					}
				})
			})
		},
		moveItem: function(node, data, indxOld, indx) {
			if (indxOld > indx) {
				data.splice(indxOld, 1);
				data.splice(indx++, 0, node)
			} else if (indxOld == indx) {
				indx++
			} else {
				data.splice(indx, 0, node);
				data.splice(indxOld, 1)
			}
			return indx
		},
		newLine: function(dataCell) {
			return isNaN(dataCell) && pq.isStr(dataCell) ? dataCell.replace(/(\r\n|\r|\n)/g, "<br>") : dataCell
		},
		objectify: function(arr) {
			var obj = {},
				len = arr.length;
			while (len--) {
				obj[arr[len]] = 1
			}
			return obj
		},
		zip: function(filename, data, type) {
			var zip = JSZip();
			zip.file(filename, data);
			return zip.generate({
				type: type || "base64",
				compression: "DEFLATE"
			})
		},
		postData: function(url, ajaxdata, ajaxOptions) {
			$.ajax($.extend({
				url: url,
				type: "POST",
				cache: false,
				data: ajaxdata,
				success: function(filename) {
					url = url + ((url.indexOf("?") > 0 ? "&" : "?") + "pq_filename=" + filename);
					$(document.body).append("<iframe height='0' width='0' frameborder='0' src=\"" + url + '"></iframe>')
				}
			}, ajaxOptions))
		},
		saveAs: function(content, name) {
			var blob = typeof content == "string" ? new Blob([content]) : content;
			if (navigator.msSaveOrOpenBlob) navigator.msSaveOrOpenBlob(blob, name);
			else {
				var a = document.createElement("a"),
					$a = $(a),
					objectURL = a.href = URL.createObjectURL(blob);
				a.download = name;
				$(document.body).append(a);
				a.click();
				$a.remove();
				URL.revokeObjectURL(objectURL)
			}
		},
		styleObj: function(style, styleObj) {
			function fn() {
				if (val === "") delete styleObj[key];
				else styleObj[key] = val
			}
			if (pq.isStr(style)) {
				styleObj = styleObj || {};
				var arr = style.split(";"),
					key, val;
				arr.forEach(function(_style) {
					if (_style) {
						arr = _style.split(":");
						key = arr[0];
						val = arr[1];
						if (key && val != null) {
							val = val.trim();
							if (key == "border") {
								pq.borderP.forEach(function(loc) {
									key = "border-" + loc;
									fn()
								})
							} else fn()
						}
					}
				})
			} else if (styleObj) {
				for (key in style) {
					val = style[key];
					fn()
				}
			} else {
				return style
			}
			return styleObj
		},
		tint: function(color, tint) {
			color = color.replace(/^#/, "");
			tint = tint * 1;
			var p = function(val, indx) {
					val = val.slice(indx, indx + 2);
					return parseInt(val, 16)
				},
				h = function(val) {
					val = val + (255 - val) * tint;
					val = Math.round(val);
					val = val > 255 ? 255 : val;
					return val.toString(16).toUpperCase()
				},
				R = p(color, 0),
				G = p(color, 2),
				B = p(color, 4);
			return h(R) + h(G) + h(B)
		},
		capitalF: function(val) {
			if (val) {
				return val[0].toUpperCase() + val.slice(1)
			}
		},
		camelCase: function(val) {
			if (val) {
				var arr = val.split("-"),
					arr1 = arr[1];
				return arr[0] + (arr1 ? arr1[0].toUpperCase() + arr1.slice(1) : "")
			}
		},
		styleStr: function(obj) {
			if (typeof obj != "string") {
				var arr = [],
					key, val;
				for (key in obj) {
					val = obj[key];
					if (val != null) arr.push(key + ":" + val)
				}
				obj = arr.length ? arr.join(";") + ";" : ""
			}
			return obj
		},
		escapeXml: function(val) {
			var obj = {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&apos;"
			};
			return val ? (val + "").replace(/(&|\<|\>|"|')/g, function(a, b) {
				return obj[b]
			}) : val
		},
		escapeXmlAttr: function(val) {
			var obj = {
				"&": "&amp;",
				"<": "&lt;",
				'"': "&quot;"
			};
			return val ? (val + "").replace(/(&|\<|")/g, function(a, b) {
				return obj[b]
			}) : val
		},
		unescapeXml: function() {
			var obj = {
				amp: "&",
				lt: "<",
				gt: ">",
				quot: '"',
				apos: "'"
			};
			return function(val) {
				return val.replace(/&(amp|lt|gt|quot|apos);/g, function(a, b) {
					return obj[b]
				})
			}
		}()
	});
	_pq.select = function(objP) {
		var attr = objP.attr,
			opts = objP.options,
			groupIndx = objP.groupIndx,
			labelIndx = objP.labelIndx,
			valueIndx = objP.valueIndx,
			jsonFormat = labelIndx != null && valueIndx != null,
			grouping = groupIndx != null,
			prepend = objP.prepend,
			dataMap = objP.dataMap,
			groupV, groupVLast, jsonF, dataMapFn = function() {
				var jsonObj = {};
				for (var k = 0; k < dataMap.length; k++) {
					var key = dataMap[k];
					jsonObj[key] = option[key]
				}
				return "data-map='" + JSON.stringify(jsonObj) + "'"
			},
			buffer = ["<select ", attr, " >"];
		if (prepend) {
			for (var key in prepend) {
				buffer.push('<option value="', key, '">', prepend[key], "</option>")
			}
		}
		if (opts && opts.length) {
			for (var i = 0, len = opts.length; i < len; i++) {
				var option = opts[i];
				if (jsonFormat) {
					var value = option[valueIndx],
						disabled = option.pq_disabled ? 'disabled="disabled" ' : "",
						selected = option.pq_selected ? 'selected="selected" ' : "";
					if (value == null) {
						continue
					}
					jsonF = dataMap ? dataMapFn() : "";
					if (grouping) {
						var disabled_group = option.pq_disabled_group ? 'disabled="disabled" ' : "";
						groupV = option[groupIndx];
						if (groupVLast != groupV) {
							if (groupVLast != null) {
								buffer.push("</optgroup>")
							}
							buffer.push('<optgroup label="', groupV, '" ', disabled_group, " >");
							groupVLast = groupV
						}
					}
					if (labelIndx == valueIndx) {
						buffer.push("<option ", selected, disabled, jsonF, ">", value, "</option>")
					} else {
						var label = option[labelIndx];
						buffer.push("<option ", selected, disabled, jsonF, ' value="', value, '">', label, "</option>")
					}
				} else if (typeof option == "object") {
					for (var key in option) {
						buffer.push('<option value="', key, '">', option[key], "</option>")
					}
				} else {
					buffer.push("<option>", option, "</option>")
				}
			}
			if (grouping) {
				buffer.push("</optgroup>")
			}
		}
		buffer.push("</select>");
		return buffer.join("")
	};
	$.fn.pqval = function(obj) {
		if (obj) {
			if (obj.incr) {
				var val = this.data("pq_value");
				this.prop("indeterminate", false);
				if (val) {
					val = false;
					this.prop("checked", false)
				} else if (val === false) {
					val = null;
					this.prop("indeterminate", true);
					this.prop("checked", false)
				} else {
					val = true;
					this.prop("checked", true)
				}
				this.data("pq_value", val);
				return val
			} else {
				val = obj.val;
				this.data("pq_value", val);
				this.prop("indeterminate", false);
				if (val === null) {
					this.prop("indeterminate", true);
					this.prop("checked", false)
				} else if (val) {
					this.prop("checked", true)
				} else {
					this.prop("checked", false)
				}
				return this
			}
		} else {
			return this.data("pq_value")
		}
	};
	_pq.xmlToArray = function(data, obj) {
		var itemParent = obj.itemParent;
		var itemNames = obj.itemNames;
		var arr = [];
		var $items = $(data).find(itemParent);
		$items.each(function(i, item) {
			var $item = $(item);
			var arr2 = [];
			$(itemNames).each(function(j, itemName) {
				arr2.push($item.find(itemName).text().replace(/\r|\n|\t/g, ""))
			});
			arr.push(arr2)
		});
		return arr
	};
	_pq.xmlToJson = function(data, obj) {
		var itemParent = obj.itemParent;
		var itemNames = obj.itemNames;
		var arr = [];
		var $items = $(data).find(itemParent);
		$items.each(function(i, item) {
			var $item = $(item);
			var arr2 = {};
			for (var j = 0, len = itemNames.length; j < len; j++) {
				var itemName = itemNames[j];
				arr2[itemName] = $item.find(itemName).text().replace(/\r|\n|\t/g, "")
			}
			arr.push(arr2)
		});
		return arr
	};
	_pq.tableToArray = function(tbl) {
		var $tbl = $(tbl),
			colModel = [],
			data = [],
			$trs = $tbl.children("tbody").children("tr"),
			$trfirst = $trs.length ? $($trs[0]) : $(),
			$trsecond = $trs.length > 1 ? $($trs[1]) : $();
		$trfirst.children("th,td").each(function(i, td) {
			var $td = $(td),
				title = $td.html(),
				width = $td.width(),
				align = "left",
				dataType = "string";
			if ($trsecond.length) {
				var $tdsec = $trsecond.find("td:eq(" + i + ")"),
					halign = $tdsec.attr("align"),
					align = halign ? halign : align
			}
			var obj = {
				title: title,
				width: width,
				dataType: dataType,
				align: align,
				dataIndx: i
			};
			colModel.push(obj)
		});
		$trs.each(function(i, tr) {
			if (i == 0) {
				return
			}
			var $tr = $(tr);
			var arr2 = [];
			$tr.children("td").each(function(j, td) {
				arr2.push($.trim($(td).html()))
			});
			data.push(arr2)
		});
		return {
			data: data,
			colModel: colModel
		}
	};
	pq.valid = {
		isFloat: function(val) {
			var pf = val * 1;
			return !isNaN(pf) && pf == val
		},
		isInt: function(val) {
			var pi = parseInt(val);
			return !isNaN(pi) && pi == val
		},
		isDate: function(val) {
			return !isNaN(Date.parse(val))
		}
	};
	var NumToLetter = [],
		letterToNum = {},
		toLetter = pq.toLetter = function(num) {
			var letter = NumToLetter[num];
			if (!letter) {
				num++;
				var mod = num % 26,
					pow = num / 26 | 0,
					out = mod ? String.fromCharCode(64 + mod) : (--pow, "Z");
				letter = pow ? toLetter(pow - 1) + out : out;
				num--;
				NumToLetter[num] = letter;
				letterToNum[letter] = num
			}
			return letter
		};

	function _toNum(letter) {
		return letter.charCodeAt(0) - 64
	}
	pq.toNumber = function(letter) {
		var num = letterToNum[letter],
			len, i, _let, _num, indx;
		if (num == null && letter) {
			len = letter.length;
			num = -1;
			i = 0;
			for (; i < len; i++) {
				_let = letter[i];
				_num = _toNum(_let);
				indx = len - i - 1;
				num += _num * Math.pow(26, indx)
			}
			NumToLetter[num] = letter;
			letterToNum[letter] = num
		}
		return num
	};
	pq.generateData = function(rows, cols) {
		var alp = [];
		for (var i = 0; i < cols; i++) {
			alp[i] = toLetter(i)
		}
		var data = [];
		for (var i = 0; i < rows; i++) {
			var row = data[i] = [];
			for (var j = 0; j < cols; j++) {
				row[j] = alp[j] + (i + 1)
			}
		}
		return data
	};
	(function() {
		var type = "w",
			s = "scrollLeft";
		$(document).one("pq:ready", function() {
			var $ele = $("<div dir='rtl' style='visibilty:hidden;height:4px;width:4px;overflow:auto;'>rtl</div>").appendTo("body"),
				ele = $ele[0],
				sl = ele[s];
			if (sl == 0) {
				ele[s] = 100;
				type = ele[s] == 0 ? "g" : "i"
			}
			$ele.remove()
		});

		function isRtl(ele) {
			var rtl = ele.rtl;
			if (rtl == null) rtl = ele.rtl = $(ele).css("direction") == "rtl";
			return rtl
		}
		pq.scrollTop = function(ele) {
			return ele.scrollTop
		};
		pq[s + "Val"] = function(ele, val) {
			var rtl = isRtl(ele),
				sl;
			if (rtl) {
				if (type == "w") sl = ele.scrollWidth - ele.clientWidth - val;
				else if (type == "g") sl = -1 * val;
				else sl = val
			} else sl = val;
			return sl
		};
		pq[s] = function(ele, val) {
			var rtl = isRtl(ele),
				sl;
			if (val == null) {
				sl = ele[s];
				if (rtl) {
					if (type == "w") return ele.scrollWidth - ele.clientWidth - sl;
					if (type == "g") return sl * -1
				}
				return sl
			}
			ele[s] = pq[s + "Val"](ele, val)
		}
	})()
})(jQuery);
(function($) {
	pq.validations = {
		minLen: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value.length >= reqVal) {
				return true
			}
		},
		nonEmpty: function(value) {
			if (value != null && value !== "") {
				return true
			}
		},
		maxLen: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value.length <= reqVal) {
				return true
			}
		},
		gt: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value > reqVal) {
				return true
			}
		},
		gte: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value >= reqVal) {
				return true
			}
		},
		lt: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value < reqVal) {
				return true
			}
		},
		lte: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value <= reqVal) {
				return true
			}
		},
		neq: function(value, reqVal, getValue) {
			value = getValue(value);
			reqVal = getValue(reqVal);
			if (value !== reqVal) {
				return true
			}
		},
		regexp: function(value, reqVal) {
			if (new RegExp(reqVal).test(value)) {
				return true
			}
		}
	};
	var _pq = $.paramquery;
	_pq.cValid = function(that) {
		this.that = that
	};
	_pq.cValid.prototype = {
		_isValidCell: function(objP) {
			var that = this.that,
				column = objP.column,
				valids = column.validations;
			if (!valids || !valids.length) {
				return {
					valid: true
				}
			}
			var value = objP.value,
				fn, dataType = column.dataType,
				getValue = function(val) {
					return that.getValueFromDataType(val, dataType, true)
				},
				rowData = objP.rowData;
			if (!rowData) {
				throw "rowData required."
			}
			for (var j = 0; j < valids.length; j++) {
				var valid = valids[j],
					on = valid.on,
					type = valid.type,
					_valid = false,
					msg = valid.msg,
					reqVal = valid.value;
				if (on === false) {
					continue
				}
				if (fn = pq.validations[type]) {
					_valid = value == null ? false : fn(value, reqVal, getValue)
				} else if (type) {
					var obj2 = {
						column: column,
						value: value,
						rowData: rowData,
						msg: msg
					};
					if (that.callFn(type, obj2) === false) {
						_valid = false;
						msg = obj2.msg
					} else {
						_valid = true
					}
				} else {
					_valid = true
				}
				if (!_valid) {
					return {
						valid: false,
						msg: msg,
						column: column,
						warn: valid.warn,
						dataIndx: column.dataIndx,
						validation: valid
					}
				}
			}
			return {
				valid: true
			}
		},
		onScrollCell: function($td, msg, icon, cls, css, style) {
			var cell, that = this.that,
				o = that.options,
				bootstrap = o.bootstrap;
			if ($td || (cell = that.getEditCell()) && cell.$cell) {
				var $cell = $td || cell.$td;
				$cell.attr("title", msg);
				var tooltipFn = "tooltip",
					tooltipShowFn = "open";
				try {
					$cell[tooltipFn]("destroy")
				} catch (ex) {}
				$cell[tooltipFn]({
					trigger: "manual",
					position: {
						my: "left center+5",
						at: "right center"
					},
					content: function() {
						var strIcon = icon == "" ? "" : "<span class='ui-icon " + icon + " pq-tooltip-icon'></span>";
						return strIcon + msg
					},
					open: function(evt, ui) {
						var tt = ui.tooltip;
						if (cls) {
							tt.addClass(cls)
						}
						if (style) {
							var olds = tt.attr("style");
							tt.attr("style", olds + ";" + style)
						}
						if (css) {
							tt.tooltip.css(css)
						}
					}
				})[tooltipFn](tooltipShowFn)
			}
		},
		isValidCell: function(objP) {
			var self = this,
				that = self.that,
				rowData = objP.rowData,
				rowIndx = objP.rowIndx,
				value = objP.value,
				valueDef = objP.valueDef,
				column = objP.column,
				focusInvalid = objP.focusInvalid,
				o = that.options,
				allowInvalid = objP.allowInvalid,
				dataIndx = column.dataIndx,
				gValid = o.validation,
				gWarn = o.warning,
				EM = o.editModel,
				errorClass = EM.invalidClass,
				warnClass = EM.warnClass,
				ae = document.activeElement;
			if (objP.checkEditable) {
				if (that.isEditable({
						rowIndx: rowIndx,
						rowData: rowData,
						column: column,
						dataIndx: dataIndx
					}) == false) {
					return {
						valid: true
					}
				}
			}
			var objvalid = this._isValidCell({
					column: column,
					value: value,
					rowData: rowData
				}),
				_valid = objvalid.valid,
				warn = objvalid.warn,
				msg = objvalid.msg;
			if (!_valid) {
				var pq_valid = $.extend({}, warn ? gWarn : gValid, objvalid.validation),
					css = pq_valid.css,
					cls = pq_valid.cls,
					icon = pq_valid.icon,
					style = pq_valid.style
			} else {
				if (that.data({
						rowData: rowData,
						dataIndx: dataIndx,
						data: "pq_valid"
					})) {
					that.removeClass({
						rowData: rowData,
						rowIndx: rowIndx,
						dataIndx: dataIndx,
						cls: warnClass + " " + errorClass
					});
					that.removeData({
						rowData: rowData,
						dataIndx: dataIndx,
						data: "pq_valid"
					})
				}
			}
			if (allowInvalid || warn) {
				if (!_valid) {
					that.addClass({
						rowData: rowData,
						rowIndx: rowIndx,
						dataIndx: dataIndx,
						cls: warn ? warnClass : errorClass
					});
					that.data({
						rowData: rowData,
						dataIndx: dataIndx,
						data: {
							pq_valid: {
								css: css,
								icon: icon,
								style: style,
								msg: msg,
								cls: cls
							}
						}
					});
					return objvalid
				} else {
					return {
						valid: true
					}
				}
			} else {
				if (!_valid) {
					if (rowIndx == null) {
						var objR = that.getRowIndx({
								rowData: rowData,
								dataUF: true
							}),
							rowIndx = objR.rowIndx;
						if (rowIndx == null || objR.uf) {
							objvalid.uf = objR.uf;
							return objvalid
						}
					}
					if (focusInvalid) {
						var $td;
						if (!valueDef) {
							that.goToPage({
								rowIndx: rowIndx
							});
							var uin = {
									rowIndx: rowIndx,
									dataIndx: dataIndx
								},
								uin = that.normalize(uin);
							$td = that.getCell(uin);
							that.scrollCell(uin, function() {
								self.onScrollCell($td, msg, icon, cls, css, style);
								that.focus(uin)
							})
						} else {
							if ($(ae).hasClass("pq-editor-focus")) {
								var indices = o.editModel.indices;
								if (indices) {
									var rowIndx2 = indices.rowIndx,
										dataIndx2 = indices.dataIndx;
									if (rowIndx != null && rowIndx != rowIndx2) {
										throw "incorrect usage of isValid rowIndx: " + rowIndx
									}
									if (dataIndx != dataIndx2) {
										throw "incorrect usage of isValid dataIndx: " + dataIndx
									}
									that.editCell({
										rowIndx: rowIndx2,
										dataIndx: dataIndx
									})
								}
							}
						}
						this.onScrollCell($td, msg, icon, cls, css, style)
					}
					return objvalid
				}
				if (valueDef) {
					var cell = that.getEditCell();
					if (cell && cell.$cell) {
						var $cell = cell.$td;
						$cell.removeAttr("title");
						try {
							$cell.tooltip("destroy")
						} catch (ex) {}
					}
				}
				return {
					valid: true
				}
			}
		},
		isValid: function(objP) {
			objP = objP || {};
			var that = this.that,
				allowInvalid = objP.allowInvalid,
				focusInvalid = objP.focusInvalid,
				checkEditable = objP.checkEditable,
				allowInvalid = allowInvalid == null ? false : allowInvalid,
				dataIndx = objP.dataIndx;
			if (dataIndx != null) {
				var column = that.columns[dataIndx],
					rowData = objP.rowData || that.getRowData(objP),
					valueDef = objP.hasOwnProperty("value"),
					value = valueDef ? objP.value : rowData[dataIndx],
					objValid = this.isValidCell({
						rowData: rowData,
						checkEditable: checkEditable,
						rowIndx: objP.rowIndx,
						value: value,
						valueDef: valueDef,
						column: column,
						allowInvalid: allowInvalid,
						focusInvalid: focusInvalid
					});
				if (!objValid.valid && !objValid.warn) {
					return objValid
				} else {
					return {
						valid: true
					}
				}
			} else if (objP.rowIndx != null || objP.rowIndxPage != null || objP.rowData != null) {
				var rowData = objP.rowData || that.getRowData(objP),
					CM = that.colModel,
					cells = [],
					warncells = [];
				for (var i = 0, len = CM.length; i < len; i++) {
					var column = CM[i],
						hidden = column.hidden;
					if (hidden) {
						continue
					}
					var dataIndx = column.dataIndx,
						value = rowData[dataIndx],
						objValid = this.isValidCell({
							rowData: rowData,
							value: value,
							column: column,
							rowIndx: objP.rowIndx,
							checkEditable: checkEditable,
							allowInvalid: allowInvalid,
							focusInvalid: focusInvalid
						});
					if (!objValid.valid && !objValid.warn) {
						if (allowInvalid) {
							cells.push({
								rowData: rowData,
								dataIndx: dataIndx,
								column: column
							})
						} else {
							return objValid
						}
					}
				}
				if (allowInvalid && cells.length) {
					return {
						cells: cells,
						valid: false
					}
				} else {
					return {
						valid: true
					}
				}
			} else {
				var data = objP.data ? objP.data : that.options.dataModel.data,
					cells = [];
				if (!data) {
					return null
				}
				for (var i = 0, len = data.length; i < len; i++) {
					var rowData = data[i],
						rowIndx;
					var objRet = this.isValid({
						rowData: rowData,
						rowIndx: rowIndx,
						checkEditable: checkEditable,
						allowInvalid: allowInvalid,
						focusInvalid: focusInvalid
					});
					var objRet_cells = objRet.cells;
					if (allowInvalid === false) {
						if (!objRet.valid) {
							return objRet
						}
					} else if (objRet_cells && objRet_cells.length) {
						cells = cells.concat(objRet_cells)
					}
				}
				if (allowInvalid && cells.length) {
					return {
						cells: cells,
						valid: false
					}
				} else {
					return {
						valid: true
					}
				}
			}
		}
	}
})(jQuery);
(function($) {
	var fnPG = {};
	fnPG.options = {
		curPage: 0,
		totalPages: 0,
		totalRecords: 0,
		msg: "",
		rPPOptions: [10, 20, 30, 40, 50, 100],
		rPP: 20,
		layout: ["first", "prev", "|", "strPage", "|", "next", "last", "|", "strRpp", "|", "refresh", "|", "strDisplay"]
	};
	fnPG._create = function() {
		var that = this,
			options = that.options,
			rtl = options.rtl,
			$ele = that.element,
			outlineMap = {
				first: that.initButton(options.strFirstPage, "seek-" + (rtl ? "end" : "first"), "first"),
				"|": "<td><span class='pq-separator'></span></td>",
				next: that.initButton(options.strNextPage, "seek-" + (rtl ? "prev" : "next"), "next"),
				prev: that.initButton(options.strPrevPage, "seek-" + (rtl ? "next" : "prev"), "prev"),
				last: that.initButton(options.strLastPage, "seek-" + (rtl ? "first" : "end"), "last"),
				strPage: that.getPageOf(),
				strRpp: that.getRppOptions(),
				refresh: that.initButton(options.strRefresh, "refresh", "refresh"),
				strDisplay: "<td><span class='pq-page-display'>" + that.getDisplay() + "</span></td>"
			},
			template = options.layout.map(function(key) {
				return outlineMap[key]
			}).join("");
		that.listeners = {};
		$ele.html("<table style='border-collapse:collapse;'><tr>" + template + "</tr></table>");
		$ele.addClass("pq-pager");
		that.$first = $ele.find(".pq-page-first");
		that.bindButton(that.$first, function(evt) {
			if (options.curPage > 1) {
				that.onChange(evt, 1)
			}
		});
		that.$prev = $ele.find(".pq-page-prev");
		that.bindButton(that.$prev, function(evt) {
			if (options.curPage > 1) {
				var curPage = options.curPage - 1;
				that.onChange(evt, curPage)
			}
		});
		that.$next = $ele.find(".pq-page-next");
		that.bindButton(that.$next, function(evt) {
			if (options.curPage < options.totalPages) {
				var val = options.curPage + 1;
				that.onChange(evt, val)
			}
		});
		that.$last = $ele.find(".pq-page-last");
		that.bindButton(that.$last, function(evt) {
			if (options.curPage !== options.totalPages) {
				var val = options.totalPages;
				that.onChange(evt, val)
			}
		});
		that.$refresh = $ele.find(".pq-page-refresh");
		that.bindButton(that.$refresh, function(evt) {
			if (that._trigger("beforeRefresh", evt) === false) {
				return false
			}
			that._trigger("refresh", evt)
		});
		that.$display = $ele.find(".pq-page-display");
		that.$select = $ele.find(".pq-page-select").val(options.rPP).on("change", that.onChangeSelect.bind(that));
		that.$totalPages = $ele.find(".pq-page-total");
		that.$curPage = $ele.find(".pq-page-current");
		that.bindCurPage(that.$curPage)
	};
	fnPG._destroy = function() {
		this.element.empty().removeClass("pq-pager").enableSelection();
		this._trigger("destroy")
	};
	fnPG._setOption = function(key, value) {
		if (key == "curPage" || key == "totalPages") {
			value = value * 1
		}
		this._super(key, value)
	};
	fnPG._setOptions = function(options) {
		var key, refresh = false,
			o = this.options;
		for (key in options) {
			var value = options[key],
				type = typeof value;
			if (type == "string" || type == "number") {
				if (value != o[key]) {
					this._setOption(key, value);
					refresh = true
				}
			} else if (pq.isFn(value.splice) || $.isPlainObject(value)) {
				if (JSON.stringify(value) != JSON.stringify(o[key])) {
					this._setOption(key, value);
					refresh = true
				}
			} else {
				if (value != o[key]) {
					this._setOption(key, value);
					refresh = true
				}
			}
		}
		if (refresh) {
			this._refresh()
		}
		return this
	};
	$.widget("paramquery.pqPager", fnPG);
	pq.pager = function(selector, options) {
		var $p = $(selector).pqPager(options),
			p = $p.data("paramqueryPqPager") || $p.data("paramquery-pqPager");
		return p
	};
	var _pq = $.paramquery,
		pqPager = _pq.pqPager;
	pqPager.regional = {};
	pqPager.defaults = pqPager.prototype.options;
	$.extend(pqPager.prototype, {
		bindButton: function($ele, fn) {
			$ele.on("click keydown", function(evt) {
				if (evt.type == "click" || evt.keyCode == $.ui.keyCode.ENTER) {
					return fn.call(this, evt)
				}
			})
		},
		bindCurPage: function($inp) {
			var that = this,
				options = this.options;
			$inp.on("keydown", function(evt) {
				if (evt.keyCode === $.ui.keyCode.ENTER) {
					$(this).trigger("change")
				}
			}).on("change", function(evt) {
				var $this = $(this),
					val = $this.val();
				if (isNaN(val) || val < 1) {
					$this.val(options.curPage);
					return false
				}
				val = parseInt(val);
				if (val === options.curPage) {
					return
				}
				if (val > options.totalPages) {
					$this.val(options.curPage);
					return false
				}
				if (that.onChange(evt, val) === false) {
					$this.val(options.curPage);
					return false
				}
			})
		},
		initButton: function(str, icon, cls) {
			return "<td><span class='pq-ui-button ui-widget-header pq-page-" + cls + "' tabindex='0' title='" + str + "'>" + "<span class='ui-icon ui-icon-" + icon + "'></span></span></td>"
		},
		onChange: function(evt, val) {
			var ui = {
				curPage: val
			};
			if (this._trigger("beforeChange", evt, ui) === false) {
				return false
			}
			this._trigger("change", evt, ui)
		},
		onChangeSelect: function(evt) {
			var $select = $(evt.target),
				that = this,
				val = $select.val() * 1,
				ui = {
					rPP: val
				};
			if (that._trigger("beforeChange", evt, ui) === false) {
				$select.val(that.options.rPP);
				return false
			}
			that.options.rPP = val;
			that._trigger("change", evt, ui)
		},
		refresh: function() {
			this._destroy();
			this._create()
		},
		format: function(o) {
			var format = o.format;
			return function(val) {
				return format ? pq.formatNumber(val, format) : val
			}
		},
		_refresh: function() {
			var that = this,
				options = that.options,
				isDisabled = options.curPage >= options.totalPages;
			that.setDisable(that.$next, isDisabled);
			that.setDisable(that.$last, isDisabled);
			isDisabled = options.curPage <= 1;
			that.setDisable(that.$first, isDisabled);
			that.setDisable(that.$prev, isDisabled);
			that.$totalPages.text(that.format(options)(options.totalPages));
			that.$curPage.val(options.curPage);
			that.$select.val(options.rPP);
			that.$display.html(this.getDisplay());
			that._trigger("refreshView")
		},
		getDisplay: function() {
			var options = this.options,
				formatFn = this.format(options);
			if (options.totalRecords > 0) {
				var rPP = options.rPP,
					strDisplay = options.strDisplay || "",
					curPage = options.curPage,
					totalRecords = options.totalRecords,
					begIndx = (curPage - 1) * rPP,
					endIndx = curPage * rPP;
				if (endIndx > totalRecords) {
					endIndx = totalRecords
				}
				strDisplay = strDisplay.replace("{0}", formatFn(begIndx + 1));
				strDisplay = strDisplay.replace("{1}", formatFn(endIndx));
				strDisplay = strDisplay.replace("{2}", formatFn(totalRecords))
			} else {
				strDisplay = ""
			}
			return strDisplay
		},
		getPageOf: function() {
			var options = this.options;
			return "<td><span>" + (options.strPage || "").replace("{0}", "<input type='text' value='" + options.curPage + "' tabindex='0' class='pq-page-current ui-corner-all' />").replace("{1}", "<span class='pq-page-total'>" + this.format(options)(options.totalPages) + "</span>") + "</span></td>"
		},
		getRppOptions: function() {
			var options = this.options,
				opts = options.rPPOptions,
				i = 0,
				len = opts.length,
				format = this.format(options),
				key, val, opt, selectStr, selectArr, strRpp = options.strRpp || "";
			if (strRpp && strRpp.indexOf("{0}") != -1) {
				selectArr = ["<select class='ui-corner-all pq-page-select' >"];
				for (; i < len; i++) {
					opt = opts[i];
					if (opt * 1 == opt) val = format(key = opt);
					else {
						key = Object.keys(opt)[0];
						val = opt[key]
					}
					selectArr.push('<option value="', key, '">', val, "</option>")
				}
				selectArr.push("</select>");
				selectStr = selectArr.join("");
				strRpp = strRpp.replace("{0}", selectStr) + "</span>"
			}
			return "<td><span class='pq-page-rppoptions'>" + strRpp + "</span></td>"
		},
		_trigger: _pq._trigger,
		on: _pq.on,
		one: _pq.one,
		off: _pq.off,
		setDisable: function($btn, disabled) {
			$btn[disabled ? "addClass" : "removeClass"]("disabled").css("pointer-events", disabled ? "none" : "").attr("tabindex", disabled ? "" : "0")
		}
	})
})(jQuery);
(function() {
	Object.assign(pq, {
		colors: {
			black: "000000",
			color1: "000000",
			color29: "800080",
			white: "FFFFFF",
			color2: "FFFFFF",
			color30: "800000",
			red: "FF0000",
			color3: "FF0000",
			color31: "008080",
			green: "00FF00",
			color4: "00FF00",
			color32: "0000FF",
			blue: "0000FF",
			color5: "0000FF",
			color33: "00CCFF",
			yellow: "FFFF00",
			color6: "FFFF00",
			color34: "CCFFFF",
			magenta: "FF00FF",
			color7: "FF00FF",
			color35: "CCFFCC",
			cyan: "00FFFF",
			color8: "00FFFF",
			color36: "FFFF99",
			color9: "800000",
			color37: "99CCFF",
			color10: "008000",
			color38: "FF99CC",
			color11: "000080",
			color39: "CC99FF",
			color12: "808000",
			color40: "FFCC99",
			color13: "800080",
			color41: "3366FF",
			color14: "008080",
			color42: "33CCCC",
			color15: "C0C0C0",
			color43: "99CC00",
			color16: "808080",
			color44: "FFCC00",
			color17: "9999FF",
			color45: "FF9900",
			color18: "993366",
			color46: "FF6600",
			color19: "FFFFCC",
			color47: "666699",
			color20: "CCFFFF",
			color48: "969696",
			color21: "660066",
			color49: "003366",
			color22: "FF8080",
			color50: "339966",
			color23: "0066CC",
			color51: "003300",
			color24: "CCCCFF",
			color52: "333300",
			color25: "000080",
			color53: "993300",
			color26: "FF00FF",
			color54: "993366",
			color27: "FFFF00",
			color55: "333399",
			color28: "00FFFF",
			color56: "333333"
		},
		splitByQuotes: str => {
			var parts = [],
				oq = true,
				currentPart = "",
				char, i = 0;
			for (; i < str.length; i++) {
				char = str[i];
				if (char === '"' && str[i - 1] != "\\") {
					oq = !oq;
					parts.push(currentPart);
					currentPart = "";
					continue
				}
				if (char == "\\" && oq) {
					continue
				}
				currentPart += char
			}
			parts.push(currentPart);
			return parts
		},
		parseFormat(formatCode) {
			var inBrackets = false,
				inQuotes = false,
				escape = false,
				fmt = "",
				brackets = "",
				prefix = "",
				suffix = "",
				currency, isDateFmt, isTextFmt, i = 0,
				len = formatCode.length,
				fmtLen, addChar = c => {
					if (fmtLen) suffix += c;
					else prefix += c
				};
			for (; i < len; i++) {
				fmtLen = fmt.length;
				var char = formatCode[i];
				if (escape) {
					addChar(char);
					escape = false;
					continue
				}
				if (char === "\\") {
					escape = true;
					if (isDateFmt || isTextFmt) {
						suffix += char
					}
					continue
				}
				if (char === '"' && !escape) {
					inQuotes = !inQuotes;
					if (isDateFmt || isTextFmt) {
						suffix += char
					}
					continue
				}
				if (inQuotes) {
					addChar(char);
					continue
				}
				if (char === "[") {
					if (formatCode[i + 1] == "$") {
						currency = char;
						do {
							char = formatCode[++i];
							currency += char
						} while (char != "]");
						currency = currency.replace(/\[\$([^-]*)(\-.*)?\]/, function(m, a, b) {
							return a || ""
						});
						addChar(currency);
						continue
					}
					inBrackets = true;
					brackets += char;
					continue
				}
				if (inBrackets) {
					if (char === "]") {
						inBrackets = false
					}
					brackets += char;
					continue
				}
				if (char == " ") {
					addChar(char);
					continue
				}
				if (/[mdyhs#0\.\,\/\?%@\.]/i.test(char)) {
					if (suffix) {
						fmt += suffix;
						suffix = ""
					}
					if (!fmtLen) {
						isDateFmt = /[mdyhs]/i.test(char);
						isTextFmt = char == "@"
					}
					fmt += char
				} else {
					addChar(char)
				}
			}
			if (prefix.endsWith("General")) {
				prefix = prefix.replace("General", "");
				fmt = "General"
			}
			if (suffix && (isDateFmt || isTextFmt)) {
				suffix = pq.splitByQuotes(suffix).join("")
			}
			return [brackets, prefix, fmt, suffix, isDateFmt ? "d" : isTextFmt ? "@" : 0]
		},
		splitByChar: function(str, ch) {
			var parts = [],
				currentPart = "",
				inQuotes, char, i = 0;
			for (; i < str.length; i++) {
				char = str[i];
				if (char === '"' && str[i - 1] != "\\") {
					inQuotes = !inQuotes
				} else if (char === ch && !inQuotes) {
					parts.push(currentPart);
					currentPart = "";
					continue
				}
				currentPart += char
			}
			parts.push(currentPart);
			return parts
		},
		decimalToFraction(decimal, maxDenominatorDigits) {
			var maxDenominator = Math.pow(10, maxDenominatorDigits),
				bestNumerator = 1,
				bestDenominator = 1,
				minDifference = Math.abs(decimal - bestNumerator / bestDenominator);
			for (var denominator = 1; denominator <= maxDenominator; denominator++) {
				var numerator = Math.round(decimal * denominator),
					difference = Math.abs(decimal - numerator / denominator);
				if (difference < minDifference) {
					bestNumerator = numerator;
					bestDenominator = denominator;
					minDifference = difference
				}
			}
			if (bestDenominator.toString().length > maxDenominatorDigits) {
				bestNumerator = Math.round(decimal * 3);
				bestDenominator = 3
			}
			return [bestNumerator, bestDenominator]
		},
		_compileText(fmt, prefix, suffix) {
			var arr = pq.splitByQuotes(fmt);
			return val => {
				var fval = "",
					i = 0;
				for (; i < arr.length; i++) {
					if (i % 2 == 0) {
						fval += arr[i].replace(/@/g, val)
					} else {
						fval += arr[i]
					}
				}
				return prefix + fval + suffix
			}
		},
		_compilePhone(fmt, prefix, suffix) {
			return _val => {
				var val = _val + "",
					fmts = fmt.split(/[^\#0]+/),
					firstFormat = fmts[0] == "",
					fillers = fmt.split(/[\#0]+/),
					values = fmts.toReversed().map(fmtPart => {
						var len = fmtPart.length,
							diff = val.length - len,
							str = val.substring(diff);
						val = diff > 0 ? val.slice(0, diff) : "";
						return pq.formatNumber(str, fmtPart)
					}).toReversed(),
					y = fillers.map((x, i) => {
						var z = values[i];
						z = z == null ? "" : z;
						return firstFormat ? z + x : x + z
					});
				return prefix + val + y.join("") + suffix
			}
		},
		_compileFraction(fmt, prefix, suffix) {
			var m = fmt.match(/([\#0]*)\s*\?+\/(\?+)/),
				frontFmt = m[1] || "",
				maxDigits = m[2].length;
			return val => {
				val = val * 1;
				var parts = (val + "").split("."),
					isMinus = val < 0,
					part0 = parts[0],
					part1 = parts[1],
					frontVal = "",
					numerator = part0,
					denominator = 1;
				if (part1) {
					var [numerator, denominator] = pq.decimalToFraction("." + part1, maxDigits);
					if (!frontFmt) {
						numerator += part0 * denominator
					}
				}
				if (frontFmt && part0) {
					frontVal = pq.formatNumber(part0, frontFmt)
				}
				if (isMinus) {
					frontVal = "-" + frontVal
				}
				var fraction = frontFmt && !part1 ? "" : numerator + "/" + denominator,
					gap = frontVal && fraction ? " " : "";
				return prefix + frontVal + gap + fraction + suffix
			}
		},
		_compileExp(fmt, prefix, suffix) {
			if (/E[\+\-]/.test(fmt)) {
				var m = fmt.match(/(\.[0\#]*)?E(\+|\-)([0\#]+)/),
					m1 = m[1],
					decimalPoints = m1 ? m1.length - 1 : 0,
					m2 = m[2],
					m3 = m[3];
				return val => {
					var fval = parseFloat(val).toExponential(decimalPoints) + "";
					fval = fval.replace(/e([\+\-])(\d+)/i, (m, a, b) => {
						return "E" + (m2 == "-" && a == "+" ? "" : a) + pq.formatNumber(b, m3)
					});
					return prefix + fval + suffix
				}
			}
		},
		_compileGeneral(_fmt, minusForNegative, prefix, suffix, locale) {
			var match = (re, indx) => (_fmt.match(re) || [])[indx || 0] || "",
				thousanAtEnd = match(/,+$/),
				thousanEndLength = thousanAtEnd.length,
				valDivisor = 1e3 ** thousanEndLength,
				percent = match(/\s*%$/),
				percentLength = percent.length,
				zeroBeforeDot = 0;
			_fmt.split("").find(x => {
				if (x == "0") zeroBeforeDot++;
				else if (x == ".") return true
			});
			_fmt = _fmt.slice(0, _fmt.length - thousanEndLength);
			_fmt = _fmt.slice(0, _fmt.length - percentLength);
			var fractionFmt = match(/\.([#0]+)/, 1),
				zeroFmt = match(/\.(0+)/, 1),
				isThousand = _fmt.indexOf(",") >= 0,
				formatter = new Intl.NumberFormat(locale, {
					useGrouping: isThousand,
					minimumFractionDigits: zeroFmt.length,
					maximumFractionDigits: fractionFmt.length,
					minimumIntegerDigits: zeroBeforeDot || undefined
				});
			return oval => {
				var val = oval;
				if (_fmt == "General") {
					fval = Math.abs(val)
				} else {
					val *= percent ? 100 : 1;
					val = val / valDivisor;
					var fval = formatter.format(Math.abs(val));
					if (zeroBeforeDot == 0 && fval[0] == "0") {
						fval = fval.slice(1)
					}
					if (percent) {
						fval = fval + " ".repeat(percentLength - 1) + "%"
					}
				}
				if (isNaN(val)) {
					return oval
				}
				return (minusForNegative && val < 0 ? "-" : "") + prefix + fval + suffix
			}
		},
		cacheDateFmt: {},
		_compileDate: function(fmt) {
			var cache = pq.cacheDateFmt;
			if (cache[fmt]) {
				return cache[fmt]
			}
			var arr = pq.splitByQuotes(fmt),
				i = 0,
				fmtPart, parts = [],
				hIndx, sIndx, obj = {
					hour12: false
				},
				replacer = CHAR => (a, indx) => {
					var len = a.length,
						prop = CHAR + len;
					if (CHAR == "M") {
						if (hIndx != null && indx > hIndx && len <= 2) {
							prop = "Z" + len;
							hIndx == null
						}
					}
					obj[prop] = 1;
					return `{${prop}}`
				};
			for (; i < arr.length; i++) {
				fmtPart = arr[i];
				if (fmtPart) {
					if (fmtPart.match(/([#0@]|\?\/\?)|General/)) {
						return [{},
							[]
						]
					}
					if (i % 2 == 0) {
						hIndx = (/h{1,2}/.exec(fmtPart) || {}).index;
						sIndx = (/s{1,2}/.exec(fmtPart) || {}).index;
						fmtPart = fmtPart.replace(/y{2,4}/gi, replacer("Y"));
						fmtPart = fmtPart.replace(/(?<![ap])m{1,5}/gi, replacer("M"));
						fmtPart = fmtPart.replace(/d{3,4}/gi, replacer("W"));
						fmtPart = fmtPart.replace(/d{1,2}/gi, replacer("D"));
						fmtPart = fmtPart.replace(/h{1,2}/gi, replacer("H"));
						fmtPart = fmtPart.replace(/s{1,2}/gi, replacer("S"));
						fmtPart = fmtPart.replace(/AM\/PM/gi, a => {
							obj.hour12 = true;
							return "{AM}"
						});
						fmtPart = fmtPart.replace(/\\"/g, '"')
					}
					parts.push(fmtPart)
				}
			}
			return cache[fmt] = [obj, parts]
		},
		_compile: function() {
			pq.phoneRE = '^([^#0?E,%."]*[#0]+[^#0?E,%.]+[#0]+[^#0?E,%."]*)+$';
			var cache = {},
				locale, phoneRE = new RegExp(pq.phoneRE),
				ccindx, getCond = (fmt, sectionIndx) => {
					if (sectionIndx < 2) {
						var m = (fmt || "").match(/\[([><]=?\-?\d+)\]/);
						if (m && m[1]) {
							ccindx++;
							return new Function("x", "return x " + m[1] + ";")
						}
					}
					if (ccindx && sectionIndx == 2) {
						return x => x * 1 == x
					}
					return [x => x > 0, x => x < 0, x => x == 0, x => isNaN(x * 1)][sectionIndx]
				},
				getColor = fmt => {
					var m = fmt.match(/\[([A-Z]+|color\s*\d+)\]/i);
					if (m && m[1]) {
						return "#" + pq.colors[m[1].toLowerCase()]
					}
				},
				fn = (_fmt, minusForNegative, prefix, suffix, typeFmt) => {
					if (_fmt) {
						if (typeFmt == "d") {
							var [obj, arr] = pq._compileDate(_fmt);
							return [obj, arr, prefix, suffix]
						}
						if (typeFmt == "@") {
							return pq._compileText(_fmt, prefix, suffix)
						}
						if (phoneRE.test(_fmt)) {
							return pq._compilePhone(_fmt, prefix, suffix)
						}
						if (_fmt.indexOf("?/?") >= 0) {
							return pq._compileFraction(_fmt, prefix, suffix)
						}
						return pq._compileExp(_fmt, prefix, suffix) || pq._compileGeneral(_fmt, minusForNegative, prefix, suffix, locale)
					} else {
						return _ => prefix + suffix
					}
				};
			return (fmt, _locale) => {
				var fmtLocale = (_locale || "") + ";" + fmt;
				if (cache[fmtLocale]) {
					return cache[fmtLocale]
				} else {
					ccindx = 0;
					locale = _locale;
					fmt = fmt.replace(/(_.|\*.)/g, "");
					var fmts = pq.splitByChar(fmt, ";"),
						useFn, useColor, sectionIndx = 0,
						fmtarr = [];
					for (; sectionIndx < 4; sectionIndx++) {
						var minusForNegative = !sectionIndx,
							fmt = fmts[sectionIndx];
						if (fmt != null) {
							var [brackets, prefix, fmtX, suffix, typeFmt] = pq.parseFormat(fmt);
							useFn = fn(fmtX, minusForNegative, prefix, suffix, typeFmt);
							useColor = getColor(brackets)
						}
						fmtarr.push({
							cond: getCond(brackets, sectionIndx),
							cb: useFn,
							color: useColor
						})
					}
					return cache[fmtLocale] = fmtarr
				}
			}
		}(),
		formatNumber: function(_val, fmt, locale, getColor) {
			if (fmt) {
				locale = locale || undefined;
				var fval, color, arr = pq._compile(fmt, locale);
				arr.find(_obj => {
					if (Array.isArray(_obj.cb)) {
						fval = pq._formatDate(_val, _obj.cb, locale);
						return true
					} else if (_obj.cond(_val)) {
						fval = _obj.cb(_val);
						color = _obj.color;
						return true
					}
				})
			} else {
				fval = _val
			}
			fval = fval == null ? "" : fval;
			return getColor ? [fval, color] : fval
		},
		deFormatNumber: function(_fval, fmt, locale) {
			if (!_fval) {
				return _fval
			}
			var fval = _fval + "";
			locale = locale || undefined;
			if (fval[0] == "." || fval[0] == ",") {
				fval = "0" + fval
			}
			var reBrackets = /((\(|\-)\D*)?[0-9]+[0-9.,]*(E(\+|\-)[0-9.,-]+)?(\D*(%|\)))?/gi,
				bracketNumber = (fval.match(reBrackets) || [])[0] || "",
				fval2 = new Intl.NumberFormat(locale).format(12345.67),
				val, reThousandSeparator = /\./g,
				inBrackets = bracketNumber.startsWith("(") && bracketNumber.endsWith(")");
			if (fval2.indexOf(",") < fval2.indexOf(".")) {
				reThousandSeparator = /,/g
			}
			var cleanedNumber = bracketNumber.replace(/[^0-9\-,\.%E]/g, "");
			var deformattedNumber = cleanedNumber.replace(reThousandSeparator, "").replace(",", ".");
			if (/\s*%$/.test(deformattedNumber)) {
				deformattedNumber = "" + parseFloat(deformattedNumber) / 100
			}
			val = inBrackets ? deformattedNumber * -1 : deformattedNumber * 1;
			if (fmt && pq.formatNumber(val, fmt, locale) != _fval) {
				return "#VALUE!"
			}
			return val
		},
		isDateFormat(fmt) {
			if (fmt) {
				var cb = (pq._compile(fmt)[0] || {}).cb;
				return Array.isArray(cb)
			}
		},
		isValidDate(val) {
			return val instanceof Date && !isNaN(val)
		},
		_formatDate: function(val, _compiledArr, locale) {
			var oval = val,
				invalid = "#VALUE!";
			if (!pq.isValidDate(val)) {
				if (val * 1 == val) {
					var dt = pq.formulas.varToDate(val);
					if (dt && dt.constructor == Date) {
						dt.setMinutes(dt.getMinutes() + dt.getTimezoneOffset())
					}
					val = dt
				} else {
					if (typeof val == "string") {
						if (val.length < 10) {
							val = pq.parseDate(val)
						}
						if (val.length == 10) {
							val += " 00:00:00"
						}
					}
					val = new Date(val)
				}
				if (!pq.isValidDate(val)) {
					return oval
				}
			}
			var part = (options, _locale) => new Intl.DateTimeFormat(_locale || locale, options).format(val),
				obj2 = {},
				durationObj = {
					1: "numeric",
					2: "2-digit",
					3: "short",
					4: "long",
					5: "narrow"
				},
				fixPadding = (val, len) => len == 2 && val.length == 1 ? "0" + val : val,
				i = 0,
				parts = [],
				[obj, arr, prefix, suffix] = _compiledArr;
			for (var key in obj) {
				var type = key[0],
					tmp = "",
					len = key[1];
				if (type == "Y") {
					tmp = part({
						year: len > 2 ? "numeric" : "2-digit"
					}, "en")
				} else if (type == "M") {
					tmp = part({
						month: durationObj[len]
					}, len <= 2 ? "en" : "")
				} else if (type == "Z") {
					tmp = part({
						minute: durationObj[len]
					});
					tmp = fixPadding(tmp, len)
				} else if (type == "D") {
					tmp = part({
						day: durationObj[len]
					}, len <= 2 ? "en" : "")
				} else if (type == "W") {
					tmp = part({
						weekday: durationObj[len]
					})
				} else if (type == "H") {
					tmp = part({
						hour: durationObj[len],
						hour12: obj.hour12
					});
					var arr2 = tmp.split(" ");
					tmp = arr2[0].replace(/\D/g, "");
					if (len == 1) {
						tmp = tmp * 1
					}
					if (obj.hour12) {
						obj2.AM = arr2[arr2.length - 1].toUpperCase()
					}
				} else if (type == "S") {
					tmp = part({
						second: durationObj[len]
					});
					tmp = fixPadding(tmp, len)
				}
				obj2[key] = tmp
			}
			for (; i < arr.length; i++) {
				var fmtPart = arr[i];
				if (fmtPart) {
					if (i % 2 == 0) {
						fmtPart = fmtPart.replace(/\{(.{2})\}/g, function(a, b) {
							return obj2[b]
						})
					}
					parts.push(fmtPart)
				}
			}
			return prefix + parts.join("") + suffix
		},
		getMonthNames: function() {
			var cache = {};
			return (format, locale) => {
				var keyCache = format + "_" + (locale || ""),
					obj = cache[keyCache];
				if (!obj) {
					obj = {};
					var formatter = new Intl.DateTimeFormat(locale, {
							month: format
						}),
						months = Array.from({
							length: 12
						}, (_, i) => new Date(0, i));
					months.map((date, indx) => {
						obj[formatter.format(date)] = indx + 1
					});
					cache[keyCache] = obj
				}
				return obj
			}
		}(),
		findMonth(month, locale) {
			var type, fm = _type => {
				type = _type;
				return pq.getMonthNames(_type, locale)[month]
			};
			return [fm("long") || fm("short"), type]
		},
		getDateFormatRegex: function() {
			var cache = {};
			return function(_format) {
				var format = _format,
					regex = cache[format];
				if (regex) {
					return regex
				}
				if (format.endsWith(" ")) {
					format = format.trim()
				} else {
					var strictEnd = true
				}
				format = format.replace(/dd|d/, match => {
					return "(0?[1-9]|[12]\\d|3[01])"
				});
				format = format.replace(/(.)(hh)(.)(mm)/, (match, a, b, c, d) => {
					return "(" + a + "\\d{1,2}" + ")?(" + c + "\\d{1,2})?"
				});
				format = format.replace(/mmmm|mmm|mm|m|yyyy|yy|hh|(.)(ss)|AM\/PM/g, (match, a, b) => {
					if (b == "ss") {
						return "(" + a + "\\d{1,2})?"
					}
					if (match == "yyyy") return "[12]\\d{3}";
					if (match == "mmmm" || match == "mmm") {
						return "[\\p{L}]{3,}"
					}
					if (match == "mm" || match == "m") {
						return "(0?[1-9]|1[012])"
					}
					if (match == "yy" || match == "hh") return "\\d{2}";
					if (match == "AM/PM") return "(AM|PM)";
					else return match
				}).replace(/\./g, "\\.");
				if (strictEnd) {
					format = format + "$"
				}
				regex = cache[_format] = new RegExp("^" + format, "u");
				return regex
			}
		}(),
		testFmtDate(val, fmts) {
			fmts = Array.isArray(fmts) ? fmts : [fmts];
			return !!fmts.find(fmt => {
				var regex = pq.getDateFormatRegex(fmt);
				return regex.test(val)
			})
		},
		parseDateFromFmt(fval, fmt, locale) {
			var [obj, parts] = pq._compileDate(fmt), month, fixPadding = val => (val + "").length == 1 ? "0" + val : val, i = 0, obj2 = {
				D: "01"
			}, invalid, isNum = x => x * 1 == x, m = fval.match(/[\p{L}0-9]+/gu);
			parts.forEach(part => {
				part.replace(/{([A-Z])(\d)}/g, function(a, b, len) {
					var val = m[i] || "",
						vlen = val.length;
					if (obj.hour12 && b == "H") {
						if (fval.endsWith("PM") && val * 1 > 12) {
							val -= 12
						}
						if (fval.endsWith("AM") && val == 12) {
							val = "00"
						}
					}
					if (isNum(val) && len != val.length) {
						if (b == "Y" || vlen > 2) {
							invalid = true
						}
					}
					if (b == "M") {
						month = val;
						if (!isNum(val)) {
							month = pq.findMonth(month, locale)[0];
							if (!month) invalid = true
						}
					} else {
						obj2[b] = val
					}
					i++
				})
			});
			[obj2.Y, month, obj2.D, obj2.H, obj2.Z, obj2.S].map(x => {
				if (x && !isNum(x)) {
					invalid = true
				}
			});
			if (invalid) {
				date = "#VALUE!"
			} else {
				var date = pq.padYear(obj2.Y) + "-" + fixPadding(month) + "-" + fixPadding(obj2.D);
				var tt = (x, delimiter, postL) => {
					if (obj2[x]) {
						date += delimiter + fixPadding(obj2[x]) + (postL || "")
					}
				};
				tt("H", " ", ":");
				tt("Z", "");
				tt("S", ":")
			}
			return date
		},
		padYear(val) {
			var currentYear2Digits = ((new Date).getFullYear() + "").slice(2, 4),
				val = val + "";
			if (val.length == 2) {
				val = val * 1 <= currentYear2Digits * 1 ? "20" + val : "19" + val
			}
			return val
		},
		parseDate(fval, fmt, locale, raw) {
			if (!fval || typeof fval != "string") {
				return ""
			}
			locale = locale || undefined;
			if (fmt && typeof fmt == "string") {
				return pq.parseDateFromFmt(fval, fmt, locale)
			}
			var partsFn = fval => fval.split(/[\s\-\/,T]+(?!(?:AM$|PM$))/),
				parts = partsFn(fval),
				part0 = parts[0],
				part1 = parts[1],
				part2 = parts[2],
				last = arr => arr[arr.length - 1],
				partLast = last(parts),
				fixPadding = val => (val + "").length == 1 ? "0" + val : val,
				currentYear = (new Date).getFullYear(),
				fn = (_options, val) => new Intl.DateTimeFormat(locale, _options).format(val),
				sampleDate = new Date("2000-01-31T13:45:15"),
				sampleD = fn({
					dateStyle: "short"
				}, sampleDate),
				sampleDParts = partsFn(sampleD),
				dayFirst = sampleDParts[0] == 31,
				year, month, day, isNum = x => x * 1 == x,
				isFullYear = x => x.length == 4 && isNum(x);
			if (partLast.match(/(:|\sAM$|\sPM$)/)) {
				parts.pop();
				var timeParts = partLast.split(/[:\s]/),
					hour = timeParts[0],
					minute = isNum(timeParts[1]) ? timeParts[1] : "00",
					second = isNum(timeParts[2]) ? timeParts[2] : "00",
					lastTimePart = last(timeParts),
					AM_PM = lastTimePart == "AM" || lastTimePart == "PM" ? lastTimePart : "";
				if (AM_PM == "PM") {
					if (hour < 12) {
						hour += 12
					}
				} else if (AM_PM == "AM") {
					if (hour == 12) {
						hour = "00"
					}
				}
			}
			if (parts.length == 2) {
				year = currentYear;
				day = 1;
				if (isFullYear(part0)) {
					year = part0;
					month = part1
				} else if (isFullYear(part1)) {
					year = part1;
					month = part0
				} else if (!isNum(part0)) {
					month = part0;
					year = part1
				} else if (!isNum(part1)) {
					day = part0;
					month = part1
				} else if (isNum(part0) && isNum(part1)) {
					if (dayFirst) {
						if (part1 <= 12) {
							month = part1;
							day = part0
						} else {
							year = part1;
							month = part0
						}
					} else {
						if (part0 <= 12) {
							month = part0;
							day = part1
						} else {
							year = part0;
							month = part1
						}
					}
				}
			} else if (parts.length == 3) {
				if (isFullYear(part0)) {
					year = part0;
					month = part1;
					day = part2
				} else if (isFullYear(part2)) {
					year = part2;
					if (isNum(part0) && (part0 > 12 || dayFirst)) {
						day = part0;
						month = part1
					} else {
						day = part1;
						month = part0
					}
				}
			}
			if (!isNum(month)) {
				month = pq.findMonth(month, locale)[0];
				if (!month) {
					return "#VALUE!"
				}
			}
			year = pq.padYear(year);
			var dt = new Date(year, month - 1, day);
			year = dt.getFullYear();
			day = dt.getDate();
			month = dt.getMonth() + 1;
			if (raw) {
				return [year, month, day, hour, minute, second]
			}
			var date = pq.padYear(year) + "-" + fixPadding(month) + "-" + fixPadding(day),
				time = "";
			if (hour) {
				time = "T" + [hour, minute, second].join(":")
			}
			return date + time
		}
	});
	pq.parseNumber = pq.deFormatNumber;
	pq.formatDate = pq.formatNumber
})();
class ClearInput extends HTMLInputElement {
	constructor() {
		super();
		this.init()
	}
	init() {
		var clearIcon = this.clearIcon = document.createElement("span"),
			parent = this.parentNode,
			parentStyle = getComputedStyle(parent);
		clearIcon.innerHTML = "✖";
		clearIcon.className = "pq-clear-icon";
		clearIcon.setAttribute("title", this.getAttribute("ctitle") || "");
		this.required = true;
		if (!/relative|absolute/.test(parentStyle.position)) {
			parent.style.position = "relative"
		}
		parent.insertBefore(clearIcon, this.nextSibling);
		clearIcon.addEventListener("mousedown", evt => {
			evt.preventDefault()
		});
		clearIcon.addEventListener("click", evt => {
			this.value = "";
			this.focus();
			this.fireEvent("change");
			this.fireEvent("input")
		})
	}
	fireEvent(event) {
		var event = new Event(event, {
			bubbles: true
		});
		this.dispatchEvent(event)
	}
	disconnectedCallback() {
		var clearIcon = this.clearIcon;
		clearIcon && clearIcon.remove()
	}
}
customElements.define("clear-text", ClearInput, {
	extends: "input"
});
(function($) {
	var cClass = function() {};
	cClass.prototype = {
		belongs: function(evt) {
			if (evt.target == this.that.element[0]) {
				return true
			}
		},
		setTimer: function(fn, interval) {
			var self = this;
			clearTimeout(self._timeID);
			self._timeID = setTimeout(function() {
				fn()
			}, interval)
		}
	};
	var _pq = $.paramquery;
	_pq.cClass = cClass;
	var fni = {
		widgetEventPrefix: "pqgrid"
	};
	fni._createWidget = function(options, element) {
		this.origOptions = options;
		$(document).triggerHandler("pq:ready");
		return $.Widget.prototype._createWidget.apply(this, arguments)
	};
	fni._create = function() {
		var that = this,
			o = that.options,
			element = that.element,
			eventNamespace = that.eventNamespace,
			bts = o.bootstrap,
			bts_on = bts.on,
			roundCorners = o.roundCorners && !bts_on,
			summaryOnTop = o.summaryOnTop,
			summaryContainer = "<div class='pq-summary-outer' ></div>",
			jui = o.ui,
			$header, $cont;
		$(document).triggerHandler("pqGrid:bootup", {
			instance: this
		});
		that.BS_on = bts_on;
		if (!o.collapsible) {
			o.collapsible = {
				on: false,
				collapsed: false
			}
		}
		if (o.flexHeight) {
			o.height = "flex"
		}
		if (o.flexWidth) {
			o.width = "flex"
		}
		that.iRefresh = new _pq.cRefresh(that);
		that.iValid = new _pq.cValid(that);
		that.tables = [];
		that.$tbl = null;
		that.iCols = new _pq.cColModel(that);
		that.iSort = new _pq.cSort(that);
		element.on("scroll" + eventNamespace, function() {
			this.scrollLeft = 0;
			this.scrollTop = 0
		}).on("mousedown" + eventNamespace, that._mouseDown.bind(that));
		var jui_grid = bts_on ? bts.grid : jui.grid,
			jui_header_o = bts_on ? "" : jui.header_o,
			jui_bottom = bts_on ? "" : jui.bottom,
			jui_top = bts_on ? bts.top : jui.top;
		element.empty().attr({
			role: "grid",
			dir: o.rtl ? "rtl" : "ltr"
		}).addClass("pq-grid pq-theme " + jui_grid + " " + (roundCorners ? " ui-corner-all" : "")).html(["<div class='pq-grid-top ", jui_top, " ", roundCorners ? " ui-corner-top" : "", "'>", "<div class='pq-grid-title", roundCorners ? " ui-corner-top" : "", "'>&nbsp;</div>", "<div class='pq-grid-pbar' style='background:red;height:2px;width:0%;display:none;'>&nbsp;</div>", "</div>", "<div class='pq-grid-center-o'>", "<div class='pq-tool-panel' style='display:", o.toolPanel.show ? "" : "none", ";'></div>", "<div class='pq-grid-center' >", "<div class='pq-header-outer ", jui_header_o, "' ></div>", summaryOnTop ? summaryContainer : "", "<div class='pq-body-outer' ></div>", summaryOnTop ? "" : summaryContainer, "</div>", "<div style='clear:both;'></div>", "</div>", "<div class='pq-grid-bottom ", jui_bottom, " ", roundCorners ? " ui-corner-bottom" : "", "'>", "<div class='pq-grid-footer'></div>", "</div>"].join(""));
		that.setLocale();
		that.$bottom = $(".pq-grid-bottom", element);
		that.$summary = $(".pq-summary-outer", element);
		that.$toolPanel = element.find(".pq-tool-panel");
		that.$top = $("div.pq-grid-top", element);
		if (!o.showTop) {
			that.$top.css("display", "none")
		}
		that.$title = $("div.pq-grid-title", element);
		if (!o.showTitle) {
			that.$title.css("display", "none")
		}
		var $grid_center = that.$grid_center = $(".pq-grid-center", element).on("scroll", function() {
				this.scrollTop = 0
			}),
			scale = that.getScale(),
			scaleX = scale[0],
			scaleY = scale[1];
		$header = that.$header = $(".pq-header-outer", $grid_center).on("scroll", function() {
			this.scrollTop = 0;
			this.scrollLeft = 0
		});
		if (!o.noStickyHeader && scaleX > .999 && scaleX < 1.001 && scaleY > .999 && scaleY < 1.001) {
			$header.css("position", "sticky")
		}
		that.$footer = $(".pq-grid-footer", element);
		$cont = that.$cont = $(".pq-body-outer", $grid_center);
		$grid_center.on("mousedown", that._onGCMouseDown.bind(that));
		that.iRenderB = new pq.cRenderBody(that, {
			$center: $grid_center,
			$b: $cont,
			$sum: that.$summary,
			header: true,
			$h: that.$header
		});
		that._trigger("render", null, {
			dataModel: that.options.dataModel,
			colModel: that.colModel
		});
		that.iKeyNav = new _pq.cKeyNav(that);
		if ("ontouchend" in document) {
			that.addTouch();
			that.contextIOS(element)
		}
		element.on("contextmenu" + eventNamespace, that.onContext.bind(that));
		$cont.on("click", ".pq-grid-cell,.pq-grid-number-cell", function(evt) {
			var target = evt.target,
				$target, $inp;
			if ($.data(target, that.widgetName + ".preventClickEvent") === true) {
				return
			}
			if (that.evtBelongs(evt)) {
				$target = $(target);
				if ($target.is("label")) {
					$inp = $target.find('input[type="checkbox"]');
					if ($inp.length) {
						evt.preventDefault();
						$inp.trigger("click");
						return
					}
				}
				return that._onClickCell(evt)
			}
		}).on("dblclick", ".pq-grid-cell", function(evt) {
			if (that.evtBelongs(evt)) {
				return that._onDblClickCell(evt)
			}
		});
		$cont.on("mousedown", that._onMouseDown.bind(that)).on("change", that._onChange(that)).on("mouseenter", ".pq-grid-cell,.pq-grid-number-cell", that._onCellMouseEnter(that)).on("mouseenter", ".pq-grid-row", that._onRowMouseEnter(that)).on("mouseleave", ".pq-grid-cell", that._onCellMouseLeave(that)).on("mouseleave", ".pq-grid-row", that._onRowMouseLeave(that)).on("keyup", that._onKeyUp(that));
		if (!o.selectionModel.native) {
			this.disableSelection()
		}
		$grid_center.on("keydown.pq-grid", that._onKeyDown(that));
		this._refreshTitle();
		that.iRows = new _pq.cRows(that);
		that.generateLoading();
		that._initPager();
		that._refreshResizable();
		that._refreshDraggable();
		that.iResizeColumns = new _pq.cResizeColumns(that);
		this._mouseInit()
	};
	fni.contextIOS = function($ele) {
		var touchIOS, preventDef, evtName = "contextmenu",
			touches;
		$ele.on("touchstart", function(evt) {
			touchIOS = 1;
			setTimeout(function() {
				if (touchIOS) {
					touches = evt.originalEvent.touches;
					if (touches.length == 1) {
						var touch = touches[0],
							e = $.Event(evtName, touch);
						$(evt.target).trigger(e);
						preventDef = 1
					}
				}
			}, 600);
			$ele.one(evtName, function() {
				touchIOS = 0
			})
		}).on("touchmove touchend", function(evt) {
			touchIOS = 0;
			if (preventDef) {
				preventDef = 0;
				evt.preventDefault()
			}
		})
	};
	fni.addTouch = function() {
		var firstTap, secondTap, ele = this.$grid_center[0];
		ele.addEventListener("touchstart", function(evt) {
			var target = evt.target,
				touch = evt.changedTouches[0];
			if (!firstTap) {
				firstTap = {
					x: touch.pageX,
					y: touch.pageY,
					target: target
				};
				setTimeout(function() {
					firstTap = null
				}, 400)
			} else if (target && target == firstTap.target) {
				var x = firstTap.x - touch.pageX,
					y = firstTap.y - touch.pageY,
					dist = Math.sqrt(x * x + y * y);
				if (dist <= 12) {
					secondTap = firstTap;
					setTimeout(function() {
						secondTap = null
					}, 500)
				}
			}
		}, true);
		ele.addEventListener("touchend", function(evt) {
			var target = evt.target;
			if (secondTap && target == secondTap.target) {
				$(target).trigger("dblclick", evt)
			}
		})
	};
	fni._mouseDown = function(evt) {
		var that = this;
		if ($(evt.target).closest(".pq-editor-focus").length) {
			this._blurEditMode = true;
			window.setTimeout(function() {
				that._blurEditMode = false
			}, 0);
			return
		}
	};
	fni.destroy = function() {
		var self = this;
		self._trigger("destroy");
		self._super();
		this.element = undefined
	};
	fni.setLocale = function() {
		var options = this.options,
			locale = options.locale;
		if (options.strLocal != locale) {
			$.extend(true, options, _pq.pqGrid.regional[locale]);
			$.extend(options.pageModel, _pq.pqPager.regional[locale])
		}
	};
	fni._setOption = function(key, value) {
		var that = this,
			options = that.options,
			pageI = that.pageI,
			a = function() {
				options[key] = value
			},
			iRB = that.iRenderB,
			iRS = that.iRenderSum,
			iRH = that.iRenderHead,
			c = function(val) {
				return val ? "addClass" : "removeClass"
			},
			cls, DM = options.dataModel;
		if (!that.$title) {
			a();
			return that
		}
		if (key === "height") {
			a();
			that._refreshResizable()
		} else if (key == "locale" || key == "pageModel") {
			a();
			if (key == "locale") that.setLocale();
			if (pageI) pageI.destroy()
		} else if (key === "width") {
			a();
			that._refreshResizable()
		} else if (key == "title") {
			a();
			that._refreshTitle()
		} else if (key == "roundCorners") {
			a();
			var addClass = c(value);
			that.element[addClass]("ui-corner-all");
			that.$top[addClass]("ui-corner-top");
			that.$bottom[addClass]("ui-corner-bottom")
		} else if (key == "freezeCols") {
			value = parseInt(value);
			if (!isNaN(value) && value >= 0 && value <= that.colModel.length - 2) {
				a()
			}
		} else if (key == "freezeRows") {
			value = parseInt(value);
			if (!isNaN(value) && value >= 0) {
				a()
			}
		} else if (key == "resizable") {
			a();
			that._refreshResizable()
		} else if (key == "draggable") {
			a();
			that._refreshDraggable()
		} else if (key == "dataModel") {
			if (value.data !== DM.data) {
				if (DM.dataUF) {
					DM.dataUF.length = 0
				}
			}
			if (value.location == "lazy" && options[key].location != "lazy") {
				that.iLazy = new _pq.Lazy(that, options)
			}
			a()
		} else if (key == "groupModel") {
			throw "use Group().option() method to set groupModel options."
		} else if (key == "treeModel") {
			throw "use Tree().option() method to set treeModel options."
		} else if (key === "colModel" || key == "columnTemplate") {
			a();
			that.iCols.init()
		} else if (key === "disabled") {
			that._super(key, value);
			if (value === true) {
				that._disable()
			} else {
				that._enable()
			}
		} else if (key === "strLoading") {
			a();
			that._refreshLoadingString()
		} else if (key === "showTop") {
			a();
			that.$top.css("display", value ? "" : "none")
		} else if (key === "showTitle") {
			a();
			that.$title.css("display", value ? "" : "none")
		} else if (key === "showToolbar") {
			a();
			var $tb = that._toolbar.widget();
			$tb.css("display", value ? "" : "none")
		} else if (key === "collapsible") {
			a();
			that._createCollapse()
		} else if (key === "showBottom") {
			a();
			that.$bottom.css("display", value ? "" : "none")
		} else if (key == "wrap" || key == "hwrap") {
			a();
			(key == "wrap" ? iRB.$tbl.add(iRS.$tbl) : iRH.$tbl)[c(!value)]("pq-no-wrap")
		} else if (key === "rowBorders") {
			a();
			addClass = c(value);
			cls = "pq-td-border-top";
			iRB.$tbl[addClass](cls);
			iRS.$tbl[addClass](cls)
		} else if (key === "columnBorders") {
			a();
			addClass = c(value);
			cls = "pq-td-border-right";
			iRB.$tbl[addClass](cls);
			iRS.$tbl[addClass](cls)
		} else if (key === "strNoRows") {
			a();
			that.$cont.find(".pq-grid-norows").text(value)
		} else {
			a()
		}
		return that
	};
	fni.options = {
		cancel: "input,textarea,button,select,option,.pq-no-capture,.ui-resizable-handle",
		trigger: false,
		bootstrap: {
			on: false,
			thead: "table table-striped table-condensed table-bordered",
			tbody: "table table-condensed",
			grid: "panel panel-default",
			top: "",
			btn: "btn btn-default",
			header_active: "active"
		},
		ui: {
			on: true,
			grid: "ui-widget ui-widget-content",
			top: "ui-widget-header",
			bottom: "",
			header_o: "ui-widget-header",
			header: "ui-state-default",
			header_active: ""
		},
		format: function(rd, col, cellprop, rowprop) {
			var key = "format",
				val = cellprop[key];
			return val == null ? rowprop[key] || col[key] : val
		},
		cellDatatype: function(rd, col) {
			return col.dataType
		},
		collapsible: {
			on: true,
			toggle: true,
			collapsed: false,
			_collapsed: false,
			refreshAfterExpand: true,
			css: {
				zIndex: 1e3
			}
		},
		colModel: null,
		columnBorders: true,
		dataModel: {
			beforeSend: function() {},
			getData: function(response) {
				return response
			},
			data: [],
			dataUF: [],
			cache: false,
			dataType: "JSON",
			location: "local",
			sorting: "local",
			sortDir: "up",
			method: "GET"
		},
		direction: "",
		draggable: false,
		editable: true,
		editModel: {
			pressToEdit: true,
			charsAllow: ["0123456789.-=eE+", "0123456789-=eE+"],
			clicksToEdit: 2,
			filterKeys: true,
			reInt: /^([-]?[1-9][0-9]*|[-]?[0-9]?)(e[-+]?)?[0-9]*$/i,
			reFloat: /^[-]?[0-9]*\.?[0-9]*(e[-+]?)?[0-9]*$/i,
			onBlur: "validate",
			saveKey: $.ui.keyCode.ENTER,
			onSave: "nextFocus",
			onTab: "nextFocus",
			allowInvalid: false,
			invalidClass: "pq-cell-red-tr pq-has-tooltip",
			warnClass: "pq-cell-blue-tr pq-has-tooltip",
			validate: true
		},
		editor: {
			select: false,
			type: "contenteditable"
		},
		summaryOptions: {
			number: "avg,max,min,stdev,stdevp,sum",
			date: "count,max,min",
			string: "count"
		},
		summaryTitle: {
			avg: "Avg: {0}",
			count: "Count: {0}",
			max: "Max: {0}",
			min: "Min: {0}",
			stdev: "Stdev: {0}",
			stdevp: "Stdevp: {0}",
			sum: "Sum: {0}"
		},
		validation: {
			icon: "ui-icon-alert",
			cls: "ui-state-error",
			style: "padding:3px 10px;"
		},
		warning: {
			icon: "ui-icon-info",
			cls: "",
			style: "padding:3px 10px;"
		},
		freezeCols: 0,
		freezeRows: 0,
		freezeBorders: true,
		height: 400,
		hoverMode: "null",
		locale: "en",
		maxColWidth: 2e3,
		minColWidth: 50,
		minWidth: 100,
		menuUI: {
			tabs: ["hideCols", "filter", "export"],
			buttons: ["clear", "ok"],
			gridOptions: {
				autoRow: false,
				copyModel: {
					render: true
				},
				editable: function(ui) {
					return !ui.rowData.pq_disabled
				},
				fillHandle: "",
				filterModel: {
					header: true,
					on: true
				},
				hoverMode: "row",
				hwrap: false,
				wrap: false,
				rowBorders: false,
				hideVScroll: true,
				scrollModel: {
					autoFit: true
				},
				showTop: false,
				height: 300
			}
		},
		mergeCells: [],
		numberCell: {
			width: 30,
			title: "",
			resizable: true,
			minWidth: 30,
			maxWidth: 100,
			show: true,
			menuUI: {
				tabs: ["hideCols", "export"]
			}
		},
		pageModel: {
			curPage: 1,
			totalPages: 0,
			rPP: 10,
			rPPOptions: [10, 20, 50, 100]
		},
		refreshCompareBy: "value",
		resizable: false,
		rowBorders: true,
		rowResize: true,
		autoRow: true,
		scrollModel: {
			autoFit: false
		},
		selectionModel: {
			column: true,
			type: "cell",
			onTab: "nextFocus",
			row: true,
			mode: "block"
		},
		showBottom: true,
		showHeader: true,
		showTitle: true,
		showToolbar: true,
		showTop: true,
		sortable: true,
		sql: false,
		stringify: true,
		stripeRows: true,
		title: "&nbsp;",
		toolPanelRules: {},
		treeModel: null,
		width: "auto",
		wrap: true,
		hwrap: false
	};
	$.widget("paramquery._pqGrid", $.ui.mouse, fni);
	var fn = _pq._pqGrid.prototype;
	fn.setData = function(data) {
		var that = this,
			o = that.options,
			pivot = o.groupModel.pivot,
			reactive = o.reactive,
			G = that.Group();
		if (pivot) G.option({
			pivot: false
		});
		that.option("dataModel.data", data);
		if (!reactive) that.refreshDataAndView();
		if (pivot) G.option({
			pivot: true
		})
	};
	fn.refreshCM = function(CM, ui) {
		if (CM) {
			this.options.colModel = CM
		}
		this.iCols.init(ui)
	};
	fn.evtBelongs = function(evt) {
		var ele = this.element[0];
		return ele && $(evt.target).closest(".pq-grid")[0] == ele
	};
	fn.readCell = function(rowData, column, iMerge, ri, ci) {
		if (iMerge && iMerge.isRootCell(ri, ci, "o") === false) {
			return undefined
		}
		return rowData[column.dataIndx]
	};
	fn._destroyResizable = function() {
		var ele = this.element,
			data = ele.data();
		if (data.resizable || data.uiResizable || data["ui-resizable"]) {
			ele.resizable("destroy")
		}
	};
	fn._disable = function() {
		if (this.$disable == null) this.$disable = $("<div class='pq-grid-disable'></div>").css("opacity", .2).appendTo(this.element)
	};
	fn._enable = function() {
		if (this.$disable) {
			this.element[0].removeChild(this.$disable[0]);
			this.$disable = null
		}
	};
	fn._destroy = function() {
		var element = this.element,
			eventNamespace = this.eventNamespace;
		this._destroyResizable();
		this._destroyDraggable();
		element.off(eventNamespace);
		$(window).off(eventNamespace);
		$(document).off(eventNamespace);
		element.empty().css("height", "").css("width", "").removeClass("pq-grid ui-widget ui-widget-content ui-corner-all").removeData()
	};
	fn._onKeyUp = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				that._trigger("keyUp", evt, null)
			}
		}
	};
	fn.onKeyDown = function(evt) {
		var that = this,
			$header = $(evt.target).closest(".pq-header-outer");
		if ($header.length) {
			return that._trigger("headerKeyDown", evt, null)
		} else {
			if (that.iKeyNav.bodyKeyDown(evt) === false) {
				return
			}
			if (that._trigger("keyDown", evt, null) == false) {
				return
			}
		}
	};
	fn._onKeyDown = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				that.onKeyDown(evt, that)
			}
		}
	};
	fn.collapse = function(objP) {
		objP = objP || {};
		var that = this,
			ele = that.element,
			o = that.options,
			CP = o.collapsible,
			$icon = CP.$collapse.children("span"),
			postCollapse = function() {
				ele.css("overflow", "hidden");
				$icon.addClass("ui-icon-circle-triangle-s").removeClass("ui-icon-circle-triangle-n");
				if (ele.hasClass("ui-resizable")) {
					ele.resizable("destroy")
				}
				if (that._toolbar) that._toolbar.disable();
				CP.collapsed = CP._collapsed = true;
				CP.animating = false;
				that._trigger("collapse")
			};
		if (CP._collapsed) {
			return false
		}
		CP.htCapture = ele.height();
		if (objP.animate === false) {
			ele.height(23);
			postCollapse()
		} else {
			CP.animating = true;
			that.disable();
			ele.animate({
				height: "23px"
			}, function() {
				postCollapse()
			})
		}
	};
	fn.expand = function(objP) {
		var that = this,
			ele = that.element,
			o = that.options,
			CP = o.collapsible,
			htCapture = CP.htCapture,
			$icon = CP.$collapse.children("span"),
			postExpand = function() {
				ele.css("overflow", "");
				CP._collapsed = CP.collapsed = false;
				that._refreshResizable();
				if (CP.refreshAfterExpand) {
					that.refresh()
				}
				$icon.addClass("ui-icon-circle-triangle-n").removeClass("ui-icon-circle-triangle-s");
				if (that._toolbar) that._toolbar.enable();
				that.enable();
				CP.animating = false;
				that._trigger("expand")
			};
		objP = objP ? objP : {};
		if (CP._collapsed === false) {
			return false
		}
		if (objP.animate === false) {
			ele.height(htCapture);
			postExpand()
		} else {
			CP.animating = true;
			ele.animate({
				height: htCapture
			}, function() {
				postExpand()
			})
		}
	};
	fn.getPics = function() {
		var that = this,
			pics = that.iPic.pics,
			imgs = [],
			charts = that.Charts().fcharts,
			k = 0;
		pics.forEach(pic => {
			imgs.push({
				width: pic.cx,
				height: pic.cy,
				image: pic.src
			})
		});
		for (; k < charts.length; k++) {
			var Chart = charts[k],
				[canvas, width, height] = Chart.getCanvas();
			imgs.push({
				width: width,
				height: height,
				image: canvas.toDataURL(),
				type: "chart"
			})
		}
		return imgs
	};

	function createUIButton(icon) {
		return "<span class='ui-widget-header pq-ui-button'><span class='ui-icon ui-icon-" + icon + "'></span></span>"
	}
	fn._createCollapse = function() {
		var that = this,
			$top = this.$top,
			o = this.options,
			CP = o.collapsible;
		if (!CP.$stripe) {
			var $stripe = $(["<div class='pq-slider-icon pq-no-capture'  >", "</div>"].join("")).appendTo($top);
			CP.$stripe = $stripe
		}
		if (CP.on) {
			if (!CP.$collapse) {
				CP.$collapse = $(createUIButton("circle-triangle-n")).appendTo(CP.$stripe).click(function() {
					if (CP.collapsed) {
						that.expand()
					} else {
						that.collapse()
					}
				})
			}
		} else if (CP.$collapse) {
			CP.$collapse.remove();
			delete CP.$collapse
		}
		if (CP.collapsed && !CP._collapsed) {
			that.collapse({
				animate: false
			})
		} else if (!CP.collapsed && CP._collapsed) {
			that.expand({
				animate: false
			})
		}
		if (CP.toggle) {
			if (!CP.$toggle) {
				CP.$toggle = $(createUIButton("arrow-4-diag")).prependTo(CP.$stripe).click(function() {
					that.toggle()
				})
			}
		} else if (CP.$toggle) {
			CP.$toggle.remove();
			delete CP.$toggle
		}
		if (CP.toggled && !CP.state) {
			this.toggle()
		}
	};
	fn.toggle = function(ui) {
		ui = ui || {};
		var o = this.options,
			CP = o.collapsible,
			$grid = this.element,
			maxim = CP.state,
			state = maxim ? "min" : "max",
			$html = $("html"),
			$win = $(window),
			$doc = $(document.body),
			scale = this.getScale(),
			scaleX = scale[0],
			scaleY = scale[1];
		if (this._trigger("beforeToggle", null, {
				state: state
			}) === false) {
			return false
		}
		if (state == "min") {
			var eleObj = maxim.grid,
				docObj = maxim.doc;
			this.option({
				height: eleObj.height,
				width: eleObj.width,
				maxHeight: eleObj.maxHeight,
				maxWidth: eleObj.maxWidth
			});
			$grid[0].style.cssText = eleObj.cssText;
			$doc[0].style.cssText = docObj.cssText;
			$html.css({
				overflow: "visible"
			});
			window.scrollTo(docObj.scrollLeft, docObj.scrollTop);
			CP.state = null;
			if (scaleParents = CP.scaleParents) {
				scaleParents.forEach(function(obj) {
					var css = {};
					if (obj.scale) {
						css.scale = obj.scale
					}
					if (obj.transform) {
						css.transform = obj.transform
					}
					$(obj.node).css(css)
				});
				scaleParents.length = 0
			}
		} else {
			if (scaleX != 1 || scaleY != 1) {
				var scaleParents = CP.scaleParents = [];
				$grid.parents().each(function(i, node) {
					var $node = $(node),
						scale = $node.css("scale"),
						transform = $node.css("transform"),
						isScale = scale != "none",
						isTrns = transform != "none",
						obj = {
							node: node
						};
					if (isScale || isTrns) {
						scaleParents.push(obj);
						if (isScale) {
							obj.scale = scale;
							$node.css("scale", "none")
						}
						if (isTrns) {
							obj.transform = transform;
							$node.css("transform", "none")
						}
						return true
					}
				})
			}
			eleObj = {
				height: o.height,
				width: o.width,
				cssText: $grid[0].style.cssText,
				maxHeight: o.maxHeight,
				maxWidth: o.maxWidth
			};
			this.option({
				height: "100%",
				width: "100%",
				maxHeight: null,
				maxWidth: null
			});
			$grid.css($.extend({
				position: "fixed",
				left: 0,
				top: 0,
				margin: 0
			}, CP.css));
			docObj = {
				scrollLeft: $win.scrollLeft(),
				scrollTop: $win.scrollTop(),
				cssText: $doc[0].style.cssText
			};
			$doc.css({
				height: 0,
				width: 0,
				overflow: "hidden",
				position: "static"
			});
			$html.css({
				overflow: "hidden"
			});
			window.scrollTo(0, 0);
			CP.state = {
				grid: eleObj,
				doc: docObj
			}
		}
		CP.toggled = !!CP.state;
		if (!ui.refresh) {
			this._trigger("toggle", null, {
				state: state
			});
			this._refreshResizable();
			this.refresh();
			$win.trigger("resize", {
				$grid: $grid,
				state: state
			})
		}
	};
	fn._onDblClickCell = function(evt) {
		var that = this,
			$td = $(evt.currentTarget),
			obj = that.getCellIndices({
				$td: $td
			});
		obj.$td = $td;
		if (that._trigger("cellDblClick", evt, obj) == false) {
			return
		}
		if (that.options.editModel.clicksToEdit > 1 && that.isEditable(obj)) {
			that.editCell(obj)
		}
		obj.$tr = $td.closest(".pq-grid-row");
		that._trigger("rowDblClick", evt, obj)
	};
	fn.getValueFromDataType = function(val, dataType, validation) {
		if ((val + "")[0] == "=") {
			return val
		}
		var val2;
		if (dataType == "date") {
			val2 = Date.parse(val);
			if (isNaN(val2)) {
				return
			} else {
				if (validation) {
					return val2
				} else {
					return val
				}
			}
		} else if (dataType == "integer") {
			val2 = parseInt(val)
		} else if (dataType == "float") {
			val2 = parseFloat(val)
		} else if (dataType == "bool") {
			if (val == null || val === true || val === false) {
				return val
			}
			val2 = $.trim(val).toLowerCase();
			if (val2.length == 0) {
				return null
			}
			if (val2 == "true" || val2 == "yes" || val2 == "1") {
				return true
			} else if (val2 == "false" || val2 == "no" || val2 == "0") {
				return false
			} else {
				return Boolean(val2)
			}
		} else if (dataType == "object") {
			return val
		} else {
			return val == null ? val : $.trim(val)
		}
		if (isNaN(val2) || val2 == null) {
			if (val == null) {
				return val
			} else {
				return null
			}
		} else {
			return val2
		}
	};
	fn.isValid = function(objP) {
		return this.iValid.isValid(objP)
	};
	fn.isValidChange = function(ui) {
		ui = ui || {};
		var changes = this.getChanges(),
			al = changes.addList,
			ul = changes.updateList,
			list = ul.concat(al);
		ui.data = list;
		return this.isValid(ui)
	};
	fn.isEditableCell = function(ui) {
		var objP = ui.normalized ? ui : this.normalize(ui),
			cEditable, ret, ebcell, rd = objP.rowData;
		if (rd && (ebcell = rd.pq_cellprop)) ret = (ebcell[objP.dataIndx] || {}).edit;
		if (ret == null && (cEditable = objP.column.editable) != null) {
			ret = typeof cEditable == "function" ? cEditable.call(this, objP) : cEditable
		}
		return ret
	};
	fn.isEditableRow = function(objP) {
		var g = this.options.editable,
			rd = objP.rowData,
			ret = rd && (rd.pq_rowprop || {}).edit;
		if (ret == null) ret = typeof g == "function" ? g.call(this, objP.normalized ? objP : this.normalize(objP)) : g;
		return ret
	};
	fn.isEditable = function(ui) {
		var ret = this.isEditableCell(ui);
		return ret == null ? this.isEditableRow(ui) : ret
	};
	fn._onMouseDownCont = function(evt, td) {
		if ($(evt.target).is(".pq-cont-inner")) {
			this.focus({
				evt: evt,
				body: true
			});
			evt.preventDefault()
		}
	};
	fn._onGCMouseDown = function() {
		var that = this;
		that._mousePQUpDelegate = function(evt) {
			$(document).off("mouseup" + that.eventNamespace, that._mousePQUpDelegate);
			that._trigger("mousePQUp", evt, null)
		};
		$(document).on("mouseup" + that.eventNamespace, that._mousePQUpDelegate)
	};
	fn._onMouseDown = function(evt) {
		var that = this;
		if (that.evtBelongs(evt)) {
			var $target = $(evt.target),
				tr, $td = $target.closest(".pq-grid-cell,.pq-grid-number-cell"),
				td = $td[0];
			if ($target.is("a")) {
				return
			}
			if (td) {
				evt.currentTarget = td;
				that._onMouseDownCell(evt)
			}
			if (evt.isPropagationStopped()) {
				return
			}
			tr = $target.closest(".pq-grid-row")[0];
			if (tr) {
				evt.currentTarget = tr;
				that._onMouseDownRow(evt)
			}
			if (evt.isPropagationStopped()) {
				return
			}
			that._onMouseDownCont(evt, td)
		}
	};
	fn._onMouseDownCell = function(evt) {
		var that = this,
			$td = $(evt.currentTarget),
			_obj = that.getCellIndices({
				$td: $td
			}),
			objP;
		if (_obj.rowIndx != null) {
			objP = this.iMerge.getRootCellO(_obj.rowIndx, _obj.colIndx, true);
			objP.$td = $td;
			that._trigger("cellMouseDown", evt, objP)
		}
	};
	fn._onMouseDownRow = function(evt) {
		var that = this,
			$tr = $(evt.currentTarget),
			objP = that.getRowIndx({
				$tr: $tr
			});
		objP.$tr = $tr;
		that._trigger("rowMouseDown", evt, objP)
	};
	fn._onCellMouseEnter = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $td = $(this),
					o = that.options,
					objP = that.getCellIndices({
						$td: $td
					});
				if (objP.rowIndx == null || objP.colIndx == null) {
					return
				}
				if (that._trigger("cellMouseEnter", evt, objP) === false) {
					return
				}
				if (o.hoverMode == "cell") {
					that.highlightCell($td)
				}
				return true
			}
		}
	};
	fn._onChange = function(that) {
		var clickEvt, changeEvt, ui;
		that.on("cellClickDone", function(evt) {
			clickEvt = evt.originalEvent;
			triggerEvt()
		});

		function triggerEvt() {
			if (clickEvt && changeEvt && changeEvt.target == clickEvt.target) {
				var key, keys = {
					ctrlKey: 0,
					metaKey: 0,
					shiftKey: 0,
					altKey: 0
				};
				for (key in keys) {
					changeEvt[key] = clickEvt[key]
				}
				that._trigger("valChange", changeEvt, ui);
				changeEvt = clickEvt = undefined
			}
		}
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $inp = $(evt.target),
					$td = $inp.closest(".pq-grid-cell");
				if ($td.length) {
					ui = that.getCellIndices({
						$td: $td
					});
					ui = that.normalize(ui);
					ui.input = $inp[0];
					changeEvt = evt;
					triggerEvt()
				}
			}
		}
	};
	fn._onRowMouseEnter = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $tr = $(this),
					o = that.options,
					objRI = that.getRowIndx({
						$tr: $tr
					}),
					rowIndxPage = objRI.rowIndxPage;
				if (that._trigger("rowMouseEnter", evt, objRI) === false) {
					return
				}
				if (o.hoverMode == "row") {
					that.highlightRow(rowIndxPage)
				}
				return true
			}
		}
	};
	fn._onCellMouseLeave = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $td = $(this);
				if (that.options.hoverMode == "cell") {
					that.unHighlightCell($td)
				}
			}
		}
	};
	fn._onRowMouseLeave = function(that) {
		return function(evt) {
			if (that.evtBelongs(evt)) {
				var $tr = $(this),
					obj = that.getRowIndx({
						$tr: $tr
					}),
					rowIndxPage = obj.rowIndxPage;
				if (that._trigger("rowMouseLeave", evt, {
						$tr: $tr,
						rowIndx: obj.rowIndx,
						rowIndxPage: rowIndxPage
					}) === false) {
					return
				}
				if (that.options.hoverMode == "row") {
					that.unHighlightRow(rowIndxPage)
				}
			}
		}
	};
	fn.enableSelection = function() {
		this.element.removeClass("pq-disable-select").off("selectstart" + this.eventNamespace)
	};
	fn.disableSelection = function() {
		this.element.addClass("pq-disable-select").on("selectstart" + this.eventNamespace, function(evt) {
			var target = evt.target,
				$target = $(target);
			if (target) {
				if ($target.is("input,textarea,select,[contenteditable=true]")) {
					return true
				} else if ($target.closest(".pq-native-select").length) {
					return true
				} else {
					evt.preventDefault()
				}
			}
		})
	};
	fn._onClickCell = function(evt) {
		var that = this,
			o = that.options,
			EM = o.editModel,
			$td = $(evt.currentTarget),
			__obj = that.getCellIndices({
				$td: $td
			}),
			objP = that.normalize(__obj),
			colIndx = objP.colIndx;
		objP.$td = $td;
		objP.evt = evt;
		if (that._trigger("beforeCellClick", evt, objP) == false) {
			return
		}
		that._trigger("cellClick", evt, objP);
		that._trigger("cellClickE", evt, objP);
		if (colIndx == null || colIndx < 0) {
			return
		}
		if (EM.clicksToEdit == 1 && that.isEditable(objP)) {
			that.editCell(objP)
		}
		objP.$tr = $td.closest(".pq-grid-row");
		that._trigger("rowClick", evt, objP)
	};
	fn._getHeadIndices = function(ri, ci) {
		var hc = this.headerCells,
			ri = ri == null ? hc.length - 1 : ri,
			row = hc[ri] || hc[ri - 1],
			col = row[ci],
			obj = {
				ri: ri,
				colIndx: ci,
				column: col,
				filterRow: !hc[ri]
			};
		return obj
	};
	fn.getHeadIndices = function(th) {
		var arr = this.iRenderB.getCellIndx(th);
		return this._getHeadIndices(arr[0], arr[1])
	};
	fn.onContext = function(evt) {
		var self = this,
			target = evt.target,
			found, parent, $parent, obj, trigger = function(evtName) {
				self._trigger(evtName, evt, obj)
			};
		if (self.evtBelongs(evt)) {
			parent = target;
			do {
				$parent = $(parent);
				obj = {
					ele: parent
				};
				if ($parent.is(".pq-grid")) {
					obj = {};
					trigger("context");
					break
				} else if ($parent.is(".pq-cont-inner")) {
					obj.type = "body";
					found = 1
				} else if ($parent.is("img")) {
					obj.type = "img";
					found = 1
				} else if ($parent.is(".pq-grid-cell,.pq-grid-number-cell")) {
					obj = self.getCellIndices({
						$td: $parent
					});
					if (obj.rowData) {
						obj.type = obj.column ? "cell" : "num";
						obj.$td = $parent;
						found = 1;
						trigger("cellRightClick")
					}
				} else if ($parent.is(".pq-tab-item")) {
					obj.id = self.iTab.getId($parent);
					obj.type = "tab";
					found = 1
				} else if ($parent.is(".pq-grid-col")) {
					obj = self.getHeadIndices(parent);
					obj.type = "head";
					obj.$th = $parent;
					found = 1;
					trigger("headRightClick")
				}
				if (found) {
					trigger("context");
					break
				}
			} while (parent = parent.parentNode)
		}
	};
	fn.highlightCell = function($td) {
		$td.addClass("pq-grid-cell-hover ui-state-hover")
	};
	fn.unHighlightCell = function($td) {
		$td.removeClass("pq-grid-cell-hover ui-state-hover")
	};
	fn.highlightRow = function(varr) {
		if (isNaN(varr)) {} else {
			var $tr = this.getRow({
				rowIndxPage: varr
			});
			if ($tr) $tr.addClass("pq-grid-row-hover ui-state-hover")
		}
	};
	fn.unHighlightRow = function(varr) {
		if (isNaN(varr)) {} else {
			var $tr = this.getRow({
				rowIndxPage: varr
			});
			if ($tr) $tr.removeClass("pq-grid-row-hover ui-state-hover")
		}
	};
	fn._getCreateEventData = function() {
		return {
			dataModel: this.options.dataModel,
			data: this.pdata,
			colModel: this.options.colModel
		}
	};
	fn._initPager = function() {
		var that = this,
			o = that.options,
			PM = o.pageModel;
		if (PM.type) {
			var obj2 = {
				bootstrap: o.bootstrap,
				change: function(evt, ui) {
					that.blurEditor({
						force: true
					});
					var DM = that.options.pageModel;
					if (ui.curPage != undefined) {
						DM.prevPage = DM.curPage;
						DM.curPage = ui.curPage
					}
					if (ui.rPP != undefined) DM.rPP = ui.rPP;
					if (DM.type == "remote") {
						that.remoteRequest({
							callback: function() {
								that._onDataAvailable({
									apply: true,
									header: false
								})
							}
						})
					} else {
						that.refreshView({
							header: false,
							source: "pager"
						})
					}
				},
				refresh: function() {
					that.refreshDataAndView()
				}
			};
			obj2 = $.extend(obj2, PM);
			obj2.rtl = o.rtl;
			that.pageI = pq.pager(PM.appendTo ? PM.appendTo : this.$footer, obj2).on("destroy", function() {
				delete that.pageI
			})
		} else {}
	};
	fn.generateLoading = function() {
		if (this.$loading) {
			this.$loading.remove()
		}
		this.$loading = $("<div class='pq-loading'></div>").appendTo(this.element);
		$(["<div class='pq-loading-bg'></div><div class='pq-loading-mask ui-state-highlight'><div>", this.options.strLoading, "...</div></div>"].join("")).appendTo(this.$loading);
		this.$loading.find("div.pq-loading-bg").css("opacity", .2)
	};
	fn._refreshLoadingString = function() {
		this.$loading.find("div.pq-loading-mask").children("div").html(this.options.strLoading)
	};
	fn.showLoading = function() {
		this.$loading.show()
	};
	fn.hideLoading = function() {
		this.$loading.hide()
	};
	fn.getTotalRows = function() {
		var o = this.options,
			DM = o.dataModel,
			data = DM.data || [],
			dataUF = DM.dataUF || [],
			PM = o.pageModel;
		if (PM.location == "remote") {
			return PM.totalRecords
		} else {
			return data.length + dataUF.length
		}
	};
	fn.refreshDataFromDataModel = function(obj) {
		obj = obj || {};
		var that = this,
			thisOptions = that.options,
			DM = thisOptions.dataModel,
			PM = thisOptions.pageModel,
			DMdata = DM.data,
			key, qt, begIndx, endIndx, totalPages, totalRecords, paging = PM.type,
			rowIndxOffset, qTriggers = that._queueATriggers;
		that._trigger("beforeRefreshData", null, {});
		if (paging == "local") {
			totalRecords = PM.totalRecords = DMdata.length;
			PM.totalPages = totalPages = Math.ceil(totalRecords / PM.rPP);
			if (PM.curPage > totalPages) {
				PM.curPage = totalPages
			}
			if (totalPages && !PM.curPage) {
				PM.curPage = 1
			}
			begIndx = (PM.curPage - 1) * PM.rPP;
			begIndx = begIndx >= 0 ? begIndx : 0;
			endIndx = PM.curPage * PM.rPP;
			if (endIndx > DMdata.length) {
				endIndx = DMdata.length
			}
			that.pdata = DMdata.slice(begIndx, endIndx);
			rowIndxOffset = begIndx
		} else if (paging == "remote") {
			PM.totalPages = totalPages = Math.ceil(PM.totalRecords / PM.rPP);
			if (PM.curPage > totalPages) {
				PM.curPage = totalPages
			}
			if (totalPages && !PM.curPage) {
				PM.curPage = 1
			}
			endIndx = PM.rPP;
			if (endIndx > DMdata.length) {
				endIndx = DMdata.length
			}
			that.pdata = DMdata.slice(0, endIndx);
			rowIndxOffset = PM.rPP * (PM.curPage - 1)
		} else {
			if (thisOptions.backwardCompat) {
				that.pdata = DMdata.slice(0)
			} else {
				that.pdata = DMdata
			}
		}
		that.riOffset = rowIndxOffset >= 0 ? rowIndxOffset : 0;
		that._trigger("dataReady", null, obj);
		that._trigger("dataReadyAfter", null, obj);
		if (obj.triggerQueue != false) {
			for (key in qTriggers) {
				qt = qTriggers[key];
				delete qTriggers[key];
				that._trigger(key, qt.evt, qt.ui)
			}
		}
	};
	fn.getQueryString = function(ui) {
		ui = ui || {};
		var that = this,
			url = "",
			dataURL = "",
			o = that.options,
			DM = o.dataModel,
			SM = o.sortModel,
			FM = o.filterModel,
			PM = o.pageModel,
			filterQS, sortingQS, sortQueryString = {},
			filterQueryString = {},
			pageQueryString = {};
		if (pq.isFn(DM.getUrl)) {
			var objk = {
					colModel: that.colModel,
					dataModel: DM,
					sortModel: SM,
					groupModel: o.groupModel,
					pageModel: PM,
					filterModel: FM
				},
				objURL = DM.getUrl.call(that, objk);
			if (objURL && objURL.url) url = objURL.url;
			if (objURL && objURL.data) dataURL = objURL.data
		} else if (pq.isStr(DM.url)) {
			url = DM.url;
			if (SM.type == "remote") {
				if (!ui.initBySort) {
					that.sort({
						initByRemote: true
					})
				}
				sortingQS = that.iSort.getQueryStringSort();
				if (sortingQS) {
					sortQueryString = {
						pq_sort: sortingQS
					}
				}
			}
			if (PM.type == "remote") {
				pageQueryString = {
					pq_curpage: PM.curPage,
					pq_rpp: PM.rPP
				}
			}
			if (FM.type != "local") {
				filterQS = that.iFilterData.getQueryStringFilter();
				if (filterQS) {
					that._queueATriggers.filter = {
						ui: {}
					};
					filterQueryString = {
						pq_filter: filterQS
					}
				}
			}
			dataURL = $.extend({
				pq_datatype: DM.dataType
			}, filterQueryString, pageQueryString, sortQueryString, that.postData(DM), DM.postDataOnce)
		}
		return {
			url: url,
			dataURL: dataURL
		}
	};
	fn.postData = function(DM) {
		var postData = DM.postData;
		if (pq.isFn(postData)) {
			postData = postData.call(this, {
				colModel: this.colModel,
				dataModel: DM
			})
		}
		return postData
	};
	fn.callXHR = function(url, dataURL, onSuccess) {
		var that = this,
			DM = that.options.dataModel;
		that.xhr = $.ajax(Object.assign({}, DM.ajaxOptions, {
			url: url,
			dataType: DM.dataType,
			async: DM.async,
			cache: DM.cache,
			contentType: DM.contentType,
			type: DM.method,
			data: dataURL,
			beforeSend: DM.beforeSend.bind(that),
			success: function(response, textStatus, jqXHR) {
				response = DM.getData.call(that, response, textStatus, jqXHR);
				onSuccess(response, textStatus, jqXHR)
			},
			error: function(jqXHR, textStatus, errorThrown) {
				that.hideLoading();
				if (pq.isFn(DM.error)) {
					DM.error.call(that, jqXHR, textStatus, errorThrown)
				} else if (errorThrown != "abort") {
					throw "Error : " + errorThrown
				}
			}
		}))
	};
	fn.remoteRequest = function(objP) {
		objP = objP || {};
		var that = this,
			obj = that.getQueryString(objP),
			url = obj.url,
			dataURL = obj.dataURL;
		if (that.xhr) {
			that.xhr.abort()
		}
		if (url) {
			that.showLoading();
			that.callXHR(url, dataURL, function(response, textStatus, jqXHR) {
				that.onRemoteSuccess(response, textStatus, jqXHR, objP)
			})
		}
	};
	fn.onRemoteSuccess = function(response, textStatus, jqXHR, objP) {
		if (!this.element) {
			return
		}
		var that = this,
			o = that.options,
			CM = that.colModel,
			PM = o.pageModel,
			DM = o.dataModel;
		DM.data = response.data;
		if (PM.type == "remote") {
			if (response.curPage != null) PM.curPage = response.curPage;
			if (response.totalRecords != null) {
				PM.totalRecords = response.totalRecords
			}
		}
		that.hideLoading();
		that._trigger("load", null, {
			dataModel: DM,
			colModel: CM
		});
		if (objP.callback) {
			objP.callback()
		}
	};
	fn._refreshTitle = function() {
		this.$title.html(this.options.title)
	};
	fn._destroyDraggable = function() {
		var ele = this.element;
		var $parent = ele.parent(".pq-wrapper");
		if ($parent.length && $parent.data("draggable")) {
			$parent.draggable("destroy");
			this.$title.removeClass("pq-draggable pq-no-capture");
			ele.unwrap(".pq-wrapper")
		}
	};
	fn._refreshDraggable = function() {
		var o = this.options,
			ele = this.element,
			$title = this.$title;
		if (o.draggable) {
			$title.addClass("pq-draggable pq-no-capture");
			var $wrap = ele.parent(".pq-wrapper");
			if (!$wrap.length) {
				ele.wrap("<div class='pq-wrapper' />")
			}
			ele.parent(".pq-wrapper").draggable({
				handle: $title
			})
		} else {
			this._destroyDraggable()
		}
	};
	fn.formatCol = function(column, val, dt) {
		var format = column.format,
			localeFmt = this.options.localeFmt;
		if (format && val != null) {
			if (pq.isFn(format)) {
				return format(val)
			}
			val = pq.formatNumber(val, format, localeFmt)
		}
		return val
	};
	fn.format = function(val, type, column) {
		if (val != null) {
			var options = this.options,
				str = "fmtDate" + type,
				format, dt = pq.getDataTypeFromVal(val),
				locale = options.localeFmt;
			if (dt != null) {
				str = "fmt" + dt + type;
				format = column[str] || options[str];
				if (!format && type == "Filter") {
					format = column.format
				}
				if (format || locale) {
					if (pq.isFn(format)) {
						return format(val)
					}
					val = pq["format" + dt](val, format, locale)
				}
			}
		}
		return val
	};
	fn.deformatCondition = function(val, column, condition) {
		var dt = pq.getDataType(column),
			found = condition ? pq.filter.conditions[condition][dt] : true;
		if (found) {
			try {
				if (pq.isFn(column.format)) {
					val = column.deFormat(val)
				} else if (dt == "number" || dt == "date") {
					val = this.deformat(val, "Filter", column)
				}
			} catch (ex) {
				val = null
			}
		}
		return val
	};
	fn.deformat = function(val, type, column) {
		if (val != null) {
			var options = this.options,
				pval, getFmt = str => column[str] || options[str],
				fmtDate = getFmt("fmtDate" + type),
				fmtNumber = getFmt("fmtNumber" + type),
				locale = options.localeFmt;
			if (fmtDate) {
				pval = pq.parseDate(val, fmtDate, locale)
			} else if (fmtNumber) {
				pval = pq.parseNumber(val, fmtDate, locale)
			} else if (pq.isFn(column.format)) {
				return column.deFormat(val)
			}
			if (pval != null && pval != "#VALUE!") return pval
		}
		return val
	};
	fn._refreshResizable = function() {
		var that = this,
			$ele = this.element,
			ele = $ele[0],
			o = this.options,
			body = document.body,
			widthPercent = (o.width + "").indexOf("%") > -1,
			heightPercent = (o.height + "").indexOf("%") > -1,
			autoWidth = o.width == "auto",
			scale, scaleX, scaleY, scaleB, scaleBX, scaleBY, flexWidth = o.width == "flex",
			flexHeight = o.height == "flex";
		if (o.resizable && (!(flexHeight || heightPercent) || !(flexWidth || widthPercent || autoWidth))) {
			var handles = "e,s,se";
			if (flexHeight || heightPercent) {
				handles = "e"
			} else if (flexWidth || widthPercent || autoWidth) {
				handles = "s"
			}
			var initReq = true;
			if ($ele.hasClass("ui-resizable")) {
				var handles2 = $ele.resizable("option", "handles");
				if (handles == handles2) {
					initReq = false
				} else {
					this._destroyResizable()
				}
			}
			if (initReq) {
				var pageX, pageY, offset, oldSize, oldPos;
				$ele.resizable({
					helper: "ui-state-default pq-border-0",
					handles: handles,
					minWidth: o.minWidth,
					minHeight: o.minHeight || 100,
					start: function(evt, ui) {
						pageX = evt.pageX;
						pageY = evt.pageY;
						scale = that.getScale();
						scaleX = scale[0];
						scaleY = scale[1];
						scaleB = pq.getScale(body);
						scaleBX = scaleB[0], scaleBY = scaleB[1];
						var rect = ele.getClientRects()[0];
						offset = {
							left: (rect.left + window.scrollX) / scaleBX,
							top: (rect.top + window.scrollY) / scaleBY
						};
						oldSize = {
							height: ele.offsetHeight,
							width: ele.offsetWidth
						};
						oldPos = {
							top: ele.style.top,
							left: ele.style.left
						};
						$(ui.helper).css({
							opacity: .5,
							background: "#ccc"
						})
					},
					resize: function(evt, ui) {
						var leftResize = $(body).css("cursor") == "e-resize",
							size = ui.size,
							dx = leftResize ? evt.pageX - pageX : 0,
							dy = leftResize ? 0 : evt.pageY - pageY,
							pos = ui.position;
						pos.left = offset.left;
						pos.top = offset.top;
						if (dx > 40) {}
						size.height = oldSize.height * scaleY / scaleBY + dy / scaleBY;
						size.width = oldSize.width * scaleX / scaleBX + dx / scaleBX
					},
					stop: function(evt, ui) {
						var width = o.width,
							height = o.height,
							widthPercent = (width + "").indexOf("%") > -1,
							heightPercent = (height + "").indexOf("%") > -1,
							autoWidth = width == "auto",
							flexWidth = width == "flex",
							flexHeight = height == "flex",
							refreshRQ, size = ui.size,
							style = ele.style;
						style.top = oldPos.top;
						style.left = oldPos.left;
						if (!heightPercent && !flexHeight) {
							refreshRQ = true;
							o.height = size.height * scaleBY / scaleY
						}
						if (!widthPercent && !autoWidth && !flexWidth) {
							refreshRQ = true;
							o.width = size.width * scaleBX / scaleX
						}
						that.refresh({
							soft: true
						});
						if (refreshRQ) {
							$(window).trigger("resize")
						}
					}
				})
			}
		} else {
			this._destroyResizable()
		}
	};
	fn.refresh = function(objP) {
		if (this.element) this.iRefresh.refresh(objP)
	};
	fn.refreshView = function(obj) {
		var self = this;
		if (self.options.editModel.indices != null) {
			self.blurEditor({
				force: true
			})
		}
		self.refreshDataFromDataModel(obj);
		self.refresh(obj)
	};
	fn._refreshPager = function() {
		var that = this,
			options = that.options,
			PM = options.pageModel,
			paging = !!PM.type,
			rPP = PM.rPP,
			totalRecords = PM.totalRecords;
		if (paging) {
			if (!that.pageI) {
				that._initPager()
			}
			that.pageI.option(PM);
			if (totalRecords > rPP) {
				that.$bottom.css("display", "")
			} else if (!options.showBottom) {
				that.$bottom.css("display", "none")
			}
		} else {
			if (that.pageI) {
				that.pageI.destroy()
			}
			if (options.showBottom) {
				that.$bottom.css("display", "")
			} else {
				that.$bottom.css("display", "none")
			}
		}
	};
	fn.getXHR = function() {
		return this.xhr
	};
	fn.refreshDataAndView = function(objP) {
		objP = objP || {};
		var self = this,
			o = self.options,
			DM = o.dataModel,
			location = DM.location,
			isLazy = location == "lazy";
		if (self._trigger("beforeNewData", null, objP) == false) {
			return
		}
		self.pdata = self.pdata || [];
		if (location == "remote") {
			self.remoteRequest({
				callback: function() {
					self._onDataAvailable(objP)
				}
			})
		} else {
			self._onDataAvailable(isLazy ? $.extend({}, objP, {
				sort: false,
				filter: false,
				group: false,
				trigger: false
			}) : objP);
			if (isLazy) {
				self.iLazy.init(objP)
			}
		}
	};
	fn.getColIndx = function(ui) {
		var dataIndx = ui.dataIndx,
			column = ui.column,
			colIndx, CM = this.colModel,
			len = CM.length,
			i = 0;
		if (column) {
			for (; i < len; i++) {
				if (CM[i] == column) return i
			}
		} else if (dataIndx != null) {
			colIndx = this.colIndxs[dataIndx];
			if (colIndx != null) return colIndx
		} else {
			throw "dataIndx / column NA"
		}
		return -1
	};
	fn.getColumn = function(obj) {
		var di = obj.dataIndx;
		if (di == null) {
			throw "dataIndx N/A"
		}
		return this.columns[di] || this.iGroup.getColsPrimary()[di]
	};
	fn._removeEditOutline = function() {
		function destroyDatePicker($editor) {
			if ($editor.hasClass("hasDatepicker")) {
				$editor.datepicker("hide").datepicker("destroy")
			}
		}
		var self = this,
			$div_focus = self.$div_focus,
			$editor;
		if ($div_focus) {
			$editor = $div_focus.find(".pq-editor-focus");
			destroyDatePicker($editor);
			if ($editor[0] == document.activeElement) {
				var prevBlurEditMode = self._blurEditMode;
				self._blurEditMode = true;
				$editor.blur();
				self._blurEditMode = prevBlurEditMode
			}
			$div_focus.removeAttr("title").empty();
			if ($div_focus.parent()[0] == self.element[0]) {
				$div_focus.remove()
			}
			delete self.$div_focus;
			var EM = self.options.editModel,
				obj = $.extend({}, EM.indices);
			EM.indices = null;
			obj.rowData = undefined;
			self.refreshCell(obj)
		}
	};
	fn.scrollX = function(x, fn) {
		var self = this;
		return self.iRenderB.scrollX(x, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollY = function(y, fn) {
		var self = this;
		return self.iRenderB.scrollY(y, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollXY = function(x, y, fn) {
		var self = this;
		return self.iRenderB.scrollXY(x, y, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollRow = function(obj, fn) {
		var self = this;
		self.iRenderB.scrollRow(self.normalize(obj).rowIndxPage, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollColumn = function(obj, fn) {
		var self = this;
		self.iRenderB.scrollColumn(self.normalize(obj).colIndx, function() {
			fn && fn.call(self)
		})
	};
	fn.scrollCell = function(obj, fn) {
		var self = this,
			ui = self.normalize(obj);
		self.iRenderB.scrollCell(ui.rowIndxPage, ui.colIndx, function() {
			fn && fn.call(self);
			self._trigger("scrollCell")
		})
	};
	fn.blurEditor = function(objP) {
		if (this.$div_focus) {
			var $editor = this.$div_focus.find(".pq-editor-focus");
			if (objP && objP.blurIfFocus) {
				if (document.activeElement == $editor[0]) {
					$editor.blur()
				}
			} else {
				return $editor.triggerHandler("blur", objP)
			}
		}
	};
	fn.Selection = function() {
		return this.iSelection
	};
	fn.goToPage = function(obj) {
		var DM = this.options.pageModel;
		if (DM.type == "local" || DM.type == "remote") {
			var rowIndx = obj.rowIndx,
				rPP = DM.rPP,
				page = obj.page == null ? Math.ceil((rowIndx + 1) / rPP) : obj.page,
				curPage = DM.curPage;
			if (page != curPage) {
				DM.curPage = page;
				if (DM.type == "local") {
					this.refreshView()
				} else {
					this.refreshDataAndView()
				}
			}
		}
	};
	fn.setSelection = function(obj, fn) {
		if (obj == null) {
			this.iSelection.removeAll();
			this.iRows.removeAll({
				all: true
			});
			return true
		}
		var self = this,
			data = self.pdata,
			cb = function() {
				if (rowIndxPage != null && obj.focus !== false) {
					self.focus({
						rowIndxPage: rowIndxPage,
						colIndx: colIndx == null ? self.getFirstVisibleCI() : colIndx
					})
				}
				fn && fn.call(self)
			};
		if (!data || !data.length) {
			cb()
		}
		obj = this.normalize(obj);
		var rowIndx = obj.rowIndx,
			rowIndxPage = obj.rowIndxPage,
			colIndx = obj.colIndx;
		if (rowIndx == null || rowIndx < 0 || colIndx < 0 || colIndx >= this.colModel.length) {
			cb()
		}
		this.goToPage(obj);
		rowIndxPage = rowIndx - this.riOffset;
		self.scrollRow({
			rowIndxPage: rowIndxPage
		}, function() {
			if (colIndx == null) {
				self.iRows.add({
					rowIndx: rowIndx
				});
				cb()
			} else {
				self.scrollColumn({
					colIndx: colIndx
				}, function() {
					self.Range({
						r1: rowIndx,
						c1: colIndx
					}).select();
					cb()
				})
			}
		})
	};
	fn.getColModel = function() {
		return this.colModel
	};
	fn.getCMPrimary = function() {
		return this.iGroup.getCMPrimary()
	};
	fn.getOCMPrimary = function() {
		return this.iGroup.getOCMPrimary()
	};
	fn.saveEditCell = function(objP) {
		var o = this.options;
		var EM = o.editModel;
		if (!EM.indices) {
			return null
		}
		var obj = $.extend({}, EM.indices),
			evt = objP ? objP.evt : null,
			offset = this.riOffset,
			colIndx = obj.colIndx,
			rowIndxPage = obj.rowIndxPage,
			rowIndx = rowIndxPage + offset,
			thisColModel = this.colModel,
			column = thisColModel[colIndx],
			dataIndx = column.dataIndx,
			pdata = this.pdata,
			rowData = pdata[rowIndxPage],
			DM = o.dataModel,
			oldVal;
		if (rowData == null) {
			return null
		}
		if (rowIndxPage != null) {
			var newVal = this.getEditCellData();
			if ($.isPlainObject(newVal)) {
				oldVal = {};
				for (var key in newVal) {
					oldVal[key] = rowData[key]
				}
			} else {
				oldVal = this.readCell(rowData, column)
			}
			if (newVal == "<br>") {
				newVal = ""
			}
			if (oldVal == null && newVal === "") {
				newVal = null
			}
			var objCell = {
				rowIndx: rowIndx,
				rowIndxPage: rowIndxPage,
				dataIndx: dataIndx,
				column: column,
				newVal: newVal,
				value: newVal,
				oldVal: oldVal,
				rowData: rowData,
				dataModel: DM
			};
			if (this._trigger("cellBeforeSave", evt, objCell) === false) {
				return false
			}
			var newRow = {};
			if ($.isPlainObject(newVal)) {
				newRow = newVal
			} else {
				newRow[dataIndx] = newVal
			}
			var ret = this.updateRow({
				row: newRow,
				rowIndx: rowIndx,
				silent: true,
				source: "edit",
				checkEditable: false
			});
			if (ret === false) {
				return false
			}
			this._trigger("cellSave", evt, objCell);
			return true
		}
	};
	fn._digestNewRow = function(newRow, oldRow, rowIndx, rowData, type, rowCheckEditable, validate, allowInvalid, source) {
		var that = this,
			getValueFromDataType = that.getValueFromDataType,
			dataIndx, columns = that.columns,
			colIndxs = that.colIndxs,
			column, colIndx;
		for (dataIndx in newRow) {
			column = columns[dataIndx];
			colIndx = colIndxs[dataIndx];
			if (column) {
				if (rowCheckEditable && that.isEditable({
						rowIndx: rowIndx,
						rowData: rowData,
						colIndx: colIndx,
						column: column,
						rowIndxPage: rowIndx - that.riOffset,
						dataIndx: dataIndx,
						normalized: true
					}) === false) {
					delete newRow[dataIndx];
					oldRow && delete oldRow[dataIndx];
					continue
				}
				var dataType = column.dataType,
					newVal = getValueFromDataType(newRow[dataIndx], dataType),
					oldVal = oldRow ? oldRow[dataIndx] : undefined;
				oldVal = oldVal !== undefined ? getValueFromDataType(oldVal, dataType) : undefined;
				newRow[dataIndx] = newVal;

				function addLink(val, rd, rd2) {
					var tmp, link, pq_cellprop = "pq_cellprop";
					if (val == undefined && (link = ((rd[pq_cellprop] || {})[dataIndx] || {}).link)) {
						tmp = rd2[pq_cellprop] = rd2[pq_cellprop] || {};
						tmp = tmp[dataIndx] = tmp[dataIndx] || {};
						tmp.link = link;
						delete rd.pq_cellprop[dataIndx].link;
						return true
					}
				}
				if (type == "update") {
					addLink(newVal, rowData, oldRow) || addLink(oldVal, newRow, rowData)
				}
				if (validate && column.validations) {
					if (source == "edit" && allowInvalid === false) {
						var objRet = this.isValid({
							focusInvalid: true,
							dataIndx: dataIndx,
							rowIndx: rowIndx,
							value: newVal
						});
						if (objRet.valid == false && !objRet.warn) {
							return false
						}
					} else {
						var wRow = type == "add" ? newRow : rowData;
						objRet = this.iValid.isValidCell({
							column: column,
							rowData: wRow,
							allowInvalid: allowInvalid,
							value: newVal
						});
						if (objRet.valid === false) {
							if (allowInvalid === false && !objRet.warn) {
								delete newRow[dataIndx]
							}
						}
					}
				}
				if (type == "update" && newVal === oldVal) {
					delete newRow[dataIndx];
					delete oldRow[dataIndx];
					continue
				}
			}
		}
		if (type == "update") {
			if (!pq.isEmpty(newRow)) {
				return true
			}
		} else {
			return true
		}
	};
	fn._digestData = function(ui) {
		if (ui.rowList) {
			throw "not supported"
		} else {
			addList = ui.addList = ui.addList || [], ui.updateList = ui.updateList || [], ui.deleteList = ui.deleteList || [];
			if (addList.length && addList[0].rowData) {
				throw "rd in addList"
			}
		}
		if (this._trigger("beforeValidate", null, ui) === false) {
			return false
		}
		var that = this,
			oldValues, dirtyCells, options = that.options,
			EM = options.editModel,
			DM = options.dataModel,
			data = DM.data || [],
			dataUF = DM.dataUF || [],
			CM = options.colModel,
			PM = options.pageModel,
			HM = options.historyModel,
			refreshCompareBy = options.refreshCompareBy,
			RB = that.iRenderB,
			dis = CM.map(function(col) {
				return col.dataIndx
			}),
			validate = ui.validate == null ? EM.validate : ui.validate,
			remotePaging = PM.type == "remote",
			allowInvalid = ui.allowInvalid == null ? EM.allowInvalid : ui.allowInvalid,
			TM = options.trackModel,
			track = ui.track,
			history = ui.history == null ? HM.on : ui.history,
			iHistory = this.iHistory,
			iUCData = this.iUCData,
			checkEditable = ui.checkEditable == null ? true : ui.checkEditable,
			checkEditableAdd = ui.checkEditableAdd == null ? checkEditable : ui.checkEditableAdd,
			source = ui.source,
			iRefresh = that.iRefresh,
			offset = this.riOffset,
			addList = ui.addList,
			updateList = ui.updateList,
			deleteList = ui.deleteList,
			addListLen, deleteListLen, updateListLen, i, len, addListNew = [],
			updateListNew = [];
		track = track == null ? options.track == null ? TM.on : options.track : track;
		for (i = 0, len = updateList.length; i < len; i++) {
			var rowListObj = updateList[i];
			if (rowListObj) {
				var newRow = rowListObj.newRow,
					rowData = rowListObj.rowData,
					rowCheckEditable = rowListObj.checkEditable,
					rowIndx = rowListObj.rowIndx,
					oldRow = rowListObj.oldRow,
					ret;
				rowCheckEditable == null && (rowCheckEditable = checkEditable);
				if (!oldRow) {
					throw "oldRow required while update"
				}
				ret = this._digestNewRow(newRow, oldRow, rowIndx, rowData, "update", rowCheckEditable, validate, allowInvalid, source);
				if (ret === false) {
					return false
				}
				ret && updateListNew.push(rowListObj)
			}
		}
		for (i = 0, len = addList.length; i < len; i++) {
			rowListObj = addList[i];
			newRow = rowListObj.newRow;
			rowCheckEditable = rowListObj.checkEditable;
			rowIndx = rowListObj.rowIndx;
			rowCheckEditable == null && (rowCheckEditable = checkEditableAdd);
			dis.forEach(function(di) {
				newRow[di] = newRow[di]
			});
			ret = this._digestNewRow(newRow, oldRow, rowIndx, rowData, "add", rowCheckEditable, validate, allowInvalid, source);
			if (ret === false) {
				return false
			}
			ret && addListNew.push(rowListObj)
		}
		addList = ui.addList = addListNew;
		updateList = ui.updateList = updateListNew;
		updateListLen = updateList.length;
		addListLen = addList.length;
		deleteListLen = deleteList.length;
		if (!addListLen && !updateListLen && !deleteListLen) {
			if (source == "edit") {
				return null
			}
			return false
		}
		if (history) {
			iHistory.increment();
			iHistory.push(ui)
		}
		if (updateListLen) {
			if (refreshCompareBy && !addListLen && !deleteListLen) {
				oldValues = RB.saveValues(refreshCompareBy)
			}
			that._digestUpdate(updateList, iUCData, track)
		}
		if (deleteListLen) {
			that._digestDelete(deleteList, iUCData, track, data, dataUF, PM, remotePaging, offset);
			iRefresh.addRowIndx()
		}
		if (addListLen) {
			that._digestAdd(addList, iUCData, track, data, PM, remotePaging, offset);
			iRefresh.addRT(addList.map(function(obj) {
				return obj.newRow
			}));
			iRefresh.addRowIndx()
		}
		that._trigger("change", null, ui);
		if (oldValues) {
			dirtyCells = RB.dirtyCells(oldValues, refreshCompareBy)
		}
		return dirtyCells || true
	};
	fn._digestUpdate = function(rowList, iUCData, track) {
		var i = 0,
			len = rowList.length,
			column, newVal, dataIndx, columns = this.columns;
		for (; i < len; i++) {
			var rowListObj = rowList[i],
				newRow = rowListObj.newRow,
				rowData = rowListObj.rowData;
			if (track) {
				iUCData.update({
					rowData: rowData,
					row: newRow,
					refresh: false
				})
			}
			for (dataIndx in newRow) {
				column = columns[dataIndx];
				if (column) {
					newVal = newRow[dataIndx];
					rowData[dataIndx] = newVal
				}
			}
		}
	};
	fn._digestAdd = function(rowList, iUCData, track, data, PM, remotePaging, offset) {
		var i = 0,
			len = rowList.length,
			indx, rowIndxPage;
		rowList.sort(function(a, b) {
			return a.rowIndx - b.rowIndx
		});
		for (; i < len; i++) {
			var rowListObj = rowList[i],
				newRow = rowListObj.newRow,
				rowIndx = rowListObj.rowIndx;
			if (track) {
				iUCData.add({
					rowData: newRow
				})
			}
			if (rowIndx == null) {
				data.push(newRow)
			} else {
				rowIndxPage = rowIndx - offset;
				indx = remotePaging ? rowIndxPage : rowIndx;
				data.splice(indx, 0, newRow)
			}
			rowListObj.rowData = newRow;
			if (remotePaging) {
				PM.totalRecords++
			}
		}
	};
	fn._digestDelete = function(rowList, iUCData, track, data, dataUF, PM, remotePaging, offset) {
		var i = 0,
			len = rowList.length,
			remArr, rowIndx;
		for (; i < len; i++) {
			var rowListObj = rowList[i],
				rowData = rowListObj.rowData,
				uf = false,
				indx = data.indexOf(rowData);
			if (indx == -1) {
				indx = dataUF.indexOf(rowData);
				if (indx >= 0) {
					uf = true
				}
			} else {
				rowListObj.rowIndx = remotePaging ? indx + offset : indx
			}
			rowListObj.uf = uf;
			rowListObj.indx = indx
		}
		rowList.sort(function(a, b) {
			return b.rowIndx - a.rowIndx
		});
		for (i = 0; i < len; i++) {
			rowListObj = rowList[i];
			rowData = rowListObj.rowData;
			uf = rowListObj.uf;
			rowIndx = rowListObj.rowIndx;
			indx = rowListObj.indx;
			if (track) {
				iUCData["delete"]({
					rowIndx: rowIndx,
					rowData: rowData
				})
			}
			if (uf) {
				dataUF.splice(indx, 1)
			} else {
				remArr = data.splice(indx, 1);
				if (remArr && remArr.length && remotePaging) {
					PM.totalRecords--
				}
			}
		}
	};
	fn.refreshColumn = function(ui) {
		var self = this,
			obj = self.normalize(ui),
			iR = self.iRenderB;
		obj.skip = true;
		iR.eachV(function(rd, rip) {
			obj.rowIndxPage = rip;
			self.refreshCell(obj)
		});
		self._trigger("refreshColumn", null, obj)
	};
	fn.refreshCell = function(ui) {
		var that = this,
			obj = that.normalize(ui),
			rip = obj.rowIndxPage,
			ci = obj.colIndx;
		if (that.iRenderB.refreshCell(rip, ci, obj.rowData, obj.column)) {
			if (!obj.skip) {
				that.refresh({
					soft: true
				});
				that._trigger("refreshCell", null, obj)
			}
		}
	};
	fn.refreshHeaderCell = function(ui) {
		var obj = this.normalize(ui),
			hc = this.headerCells,
			rip = hc.length - 1,
			rd = hc[rip];
		this.iRenderHead.refreshCell(rip, obj.colIndx, rd, obj.column)
	};
	fn.refreshRow = function(_obj) {
		if (this.pdata) {
			var that = this,
				obj = that.normalize(_obj),
				ri = obj.rowIndx,
				rip = obj.rowIndxPage,
				_fe, rowData = obj.rowData;
			if (!rowData) {
				return null
			}
			that.iRenderB.refreshRow(rip);
			that.refresh({
				soft: true
			});
			that._trigger("refreshRow", null, {
				rowData: rowData,
				rowIndx: ri,
				rowIndxPage: rip
			});
			return true
		}
	};
	fn.quitEditMode = function(objP) {
		if (this._quitEditMode) {
			return
		}
		var that = this,
			old = false,
			silent = false,
			fireOnly = false,
			o = this.options,
			EM = o.editModel,
			EMIndices = EM.indices,
			evt = undefined;
		that._quitEditMode = true;
		if (objP) {
			old = objP.old;
			silent = objP.silent;
			fireOnly = objP.fireOnly;
			evt = objP.evt
		}
		if (EMIndices) {
			if (!silent && !old) {
				this._trigger("editorEnd", evt, EMIndices)
			}
			if (!fireOnly) {
				this._removeEditOutline(objP);
				EM.indices = null
			}
		}
		that._quitEditMode = null
	};
	fn.getViewPortRowsIndx = function() {
		return {
			beginIndx: this.initV,
			endIndx: this.finalV
		}
	};
	fn.getViewPortIndx = function() {
		var iR = this.iRenderB;
		return {
			initV: iR.initV,
			finalV: iR.finalV,
			initH: iR.initH,
			finalH: iR.finalH
		}
	};
	fn.getRIOffset = function() {
		return this.riOffset
	};
	fn.getEditCell = function() {
		var EM = this.options.editModel;
		if (EM.indices) {
			var $td = this.getCell(EM.indices),
				$cell = this.$div_focus,
				$editor = $cell.find(".pq-editor-focus");
			return {
				$td: $td,
				$cell: $cell,
				$editor: $editor
			}
		} else {
			return {}
		}
	};
	fn.editCell = function(ui) {
		var self = this,
			obj = self.normalize(ui),
			iM = self.iMerge,
			m, $td, ri = obj.rowIndx,
			ci = obj.colIndx;
		if (iM.ismergedCell(ri, ci)) {
			m = iM.getRootCellO(ri, ci);
			if (m.rowIndx != obj.rowIndx || m.colIndx != obj.colIndx) {
				return false
			}
		}
		self.scrollCell(obj, function() {
			$td = self.getCell(obj);
			if ($td && $td.length) {
				return self._editCell(obj)
			}
		})
	};
	fn.getFirstEditableColIndx = function(objP) {
		if (objP.rowIndx == null) {
			throw "rowIndx NA"
		}
		var CM = this.colModel,
			i = 0;
		for (; i < CM.length; i++) {
			if (CM[i].hidden) {
				continue
			}
			objP.colIndx = i;
			if (!this.isEditable(objP)) {
				continue
			}
			return i
		}
		return -1
	};
	fn.editFirstCellInRow = function(objP) {
		var obj = this.normalize(objP),
			ri = obj.rowIndx,
			colIndx = this.getFirstEditableColIndx({
				rowIndx: ri
			});
		if (colIndx != -1) {
			this.editCell({
				rowIndx: ri,
				colIndx: colIndx
			})
		}
	};
	fn.getEditor = function(_ui, props) {
		var self = this,
			ui = self.normalize(_ui),
			fn = function(cb) {
				return pq.isFn(cb) ? cb.call(self, ui) : cb
			},
			geditor = fn(self.options.editor),
			ceditor = fn(ui.column.editor),
			editor = $.extend(true, {}, geditor, ceditor == false ? {
				type: false
			} : ceditor);
		(props || ["attr", "cls", "style", "type", "options"]).forEach(function(prop) {
			editor[prop] = fn(editor[prop]) || ""
		});
		return editor
	};
	fn._editCell = function(_objP) {
		var that = this,
			objP = that.normalize(_objP),
			isEditByPress = objP.editByPress,
			evt = objP.evt,
			rip = objP.rowIndxPage,
			ci = objP.colIndx,
			iKeyNav = that.iKeyNav,
			pdata = that.pdata;
		if (!pdata || rip >= pdata.length) {
			return false
		}
		var o = that.options,
			EM = o.editModel,
			rowData = pdata[rip],
			rowIndx = objP.rowIndx,
			CM = that.colModel,
			column = CM[ci],
			dataIndx = column.dataIndx,
			cellData = that.readCell(rowData, column),
			objCall = {
				rowIndx: rowIndx,
				rowIndxPage: rip,
				cellData: cellData,
				rowData: rowData,
				dataIndx: dataIndx,
				colIndx: ci,
				column: column
			},
			editor = that.getEditor(objCall),
			edtype = editor.type,
			contentEditable = edtype == "contenteditable";
		if (edtype == false) {
			return
		}
		if (EM.indices) {
			var indxOld = EM.indices;
			if (indxOld.rowIndxPage == rip && indxOld.colIndx == ci) {
				var $focus = that.$div_focus.find(".pq-editor-focus");
				if (document.activeElement != $focus[0]) {
					$focus.focus();
					window.setTimeout(function() {
						$focus.focus()
					}, 0)
				}
				return false
			} else {
				if (that.blurEditor({
						evt: evt
					}) === false) {
					return false
				}
				that.quitEditMode({
					evt: evt
				})
			}
		}
		isEditByPress || that.focus(objP);
		EM.indices = {
			rowIndxPage: rip,
			rowIndx: rowIndx,
			colIndx: ci,
			column: column,
			dataIndx: dataIndx
		};
		var $cell, $editor = $(document.activeElement);
		if (editor.appendTo == "grid") {
			$cell = $("<div></div>").appendTo(that.element);
			$cell.append($editor)
		} else {
			$cell = $editor.parent()
		}
		that.$div_focus = $cell;
		$cell.addClass("pq-editor-outer");
		$cell.addClass("pq-align-" + (column.align || "left"));
		objCall.$cell = $cell;
		var inp, edSelect = objP.select == null ? editor.select : objP.select,
			ed_valueIndx = editor.valueIndx,
			ed_dataMap = editor.dataMap,
			ed_mapIndices = editor.mapIndices || {},
			edcls = editor.cls,
			cls = "pq-editor-focus " + edcls,
			cls2 = cls + " pq-cell-editor ",
			attr = editor.attr,
			edstyle = editor.style,
			styleCE = edstyle ? "style='" + edstyle + "'" : "",
			style = styleCE,
			styleChk = styleCE;
		objCall.cls = cls;
		objCall.attr = attr;
		iKeyNav.ignoreBlur(function() {
			if (edtype == "checkbox") {
				var subtype = editor.subtype,
					checked = cellData ? "checked='checked'" : "";
				inp = "<input " + checked + " class='" + cls2 + "' " + attr + " " + styleChk + " type=checkbox name='" + dataIndx + "' />";
				$cell.html(inp);
				var $ele = $cell.children("input");
				if (subtype == "triple") {
					$ele.pqval({
						val: cellData
					});
					$cell.click(function() {
						$(this).children("input").pqval({
							incr: true
						})
					})
				}
			} else if (edtype == "select") {
				var options = editor.options || [],
					attrSelect = [attr, " class='", cls2, "' ", style, " name='", dataIndx, "'"].join("");
				inp = _pq.select({
					options: options,
					attr: attrSelect,
					prepend: editor.prepend,
					labelIndx: editor.labelIndx,
					valueIndx: ed_valueIndx,
					groupIndx: editor.groupIndx,
					dataMap: ed_dataMap
				});
				$cell.empty();
				$(inp).appendTo($cell).val(ed_valueIndx != null && (ed_mapIndices[ed_valueIndx] || that.columns[ed_valueIndx]) ? ed_mapIndices[ed_valueIndx] ? rowData[ed_mapIndices[ed_valueIndx]] : rowData[ed_valueIndx] : cellData)
			} else if (edtype == "textarea" || edtype == "textbox" || contentEditable) {
				$editor.addClass(cls2);
				$editor.attr($.extend({
					name: dataIndx
				}, contentEditable ? {
					contentEditable: true
				} : {
					readonly: false
				}));
				var fmtVal = that.format(cellData, "Edit", column);
				isEditByPress || $editor.val(fmtVal)
			} else if (edtype) {
				$cell.html("<" + edtype + " class='" + cls2 + "' tabindex=0 " + attr + " " + style + ">")
			}
		});
		objCall.$editor = $focus = $cell.children(".pq-editor-focus");
		var FK = EM.filterKeys,
			$td = that.getCell(EM.indices),
			cEM = column.editModel;
		if (cEM && cEM.filterKeys !== undefined) {
			FK = cEM.filterKeys
		}
		if (edtype != "textarea" && edtype != "contenteditable") $td.empty();
		var objTrigger = {
			$cell: $cell,
			cellData: cellData,
			$editor: $focus,
			$td: $td,
			dataIndx: dataIndx,
			column: column,
			colIndx: ci,
			rowIndx: rowIndx,
			rowIndxPage: rip,
			rowData: rowData,
			editor: editor
		};
		$td.trigger("focusout");
		that._trigger("editorBegin", evt, objTrigger);
		EM.indices = objTrigger;
		$focus = $cell.children(".pq-editor-focus");
		$focus.data({
			FK: FK
		}).on("click", function() {
			$(this).focus();
			that._trigger("editorClick", null, objTrigger)
		}).on("keydown", iKeyNav.keyDownInEdit.bind(iKeyNav)).on("keypress", function(evt) {
			return iKeyNav.keyPressInEdit(evt, {
				FK: FK
			})
		}).on("keyup", function(evt) {
			return iKeyNav.keyUpInEdit(evt, {
				FK: FK
			})
		}).on("blur", function(evt, objP) {
			var EM = o.editModel,
				onBLurCol = (objTrigger.column.editModel || {}).onBlur,
				onBlur = onBLurCol == null ? EM.onBlur : onBLurCol,
				saveOnBlur = onBlur == "save",
				ae = document.activeElement,
				$this = $(evt.target),
				validateOnBlur = onBlur == "validate",
				cancelBlurCls = EM.cancelBlurCls,
				force = objP ? objP.force : false;
			if (that._quitEditMode || that._blurEditMode) {
				return
			}
			if (!EM.indices) {
				return
			}
			if (!force) {
				if (that._trigger("editorBlur", evt, objTrigger) === false) {
					return
				}
				if (!onBlur) {
					return
				}
				if ($this[0] == ae) {
					return
				}
				if (cancelBlurCls && $this.hasClass(cancelBlurCls)) {
					return
				}
				if ($this.hasClass("pq-autocomplete-text")) {
					if ($("." + $this.data("id")).is(":visible")) return
				} else if ($this.hasClass("hasDatepicker")) {
					if ($this.datepicker("widget").is(":visible")) {
						return false
					}
				} else if ($this.hasClass("ui-autocomplete-input")) {
					if ($this.autocomplete("widget").is(":visible")) return
				} else if ($this.hasClass("ui-multiselect")) {
					if ($(".ui-multiselect-menu").is(":visible") || $(ae).closest(".ui-multiselect-menu").length) {
						return
					}
				} else if ($this.hasClass("pq-select-button")) {
					if ($(".pq-select-menu").is(":visible") || $(ae).closest(".pq-select-menu").length) {
						return
					}
				} else if (editor.preventClose) {
					if (editor.preventClose.call(that, objTrigger)) {
						return
					}
				}
			}
			that._blurEditMode = true;
			var silent = force || saveOnBlur || !validateOnBlur;
			if (!that.saveEditCell({
					evt: evt,
					silent: silent
				})) {
				if (!force && validateOnBlur) {
					that._deleteBlurEditMode();
					return false
				}
			}
			that.quitEditMode({
				evt: evt
			});
			that._deleteBlurEditMode()
		}).on("focus", function(evt) {
			that._trigger("editorFocus", evt, objTrigger)
		});
		$focus.focus();
		window.setTimeout(function() {
			var $ae = $(document.activeElement);
			if ($ae.hasClass("pq-editor-focus") === false) {
				var $focus = that.element ? that.element.find(".pq-editor-focus") : $();
				$focus.focus()
			}
		});
		if (!isEditByPress && edSelect) {
			$focus.select()
		}
	};
	fn._deleteBlurEditMode = function(objP) {
		var that = this;
		objP = objP || {};
		if (that._blurEditMode) {
			if (objP.timer) {
				window.setTimeout(function() {
					delete that._blurEditMode
				}, 0)
			} else {
				delete that._blurEditMode
			}
		}
	};
	fn.getRow = function(_obj) {
		var obj = this.normalize(_obj),
			rip = obj.rowIndxPage;
		return this.iRenderB.get$Row(rip)
	};
	fn.getScale = function() {
		return pq.getScale(this.element[0])
	};
	fn.getCell = function(ui) {
		if (ui) {
			if (ui.vci >= 0) ui.colIndx = this.iCols.getci(ui.vci);
			var obj = this.normalize(ui),
				rip = obj.rowIndxPage,
				ci = obj.colIndx,
				td = this.iRenderB.getCell(rip, ci)
		}
		return $(td)
	};
	fn.getCellHeader = function(ui, filterRow) {
		if (ui.vci >= 0) ui.colIndx = this.iCols.getci(ui.vci);
		var obj = this.normalize(ui),
			ci = obj.colIndx,
			ri = obj.ri,
			ri = ri == null ? this.headerCells.length - (filterRow ? 0 : 1) : ri,
			th = this.iRenderHead.getCell(ri, ci);
		return $(th)
	};
	fn.getCellSum = function(ri, ci) {
		return $(this.iRenderSum.getCell(ri, ci))
	};
	fn.getCellFilter = function(ui) {
		ui.ri = null;
		return this.getCellHeader(ui, true)
	};
	fn.getEditorIndices = function() {
		var obj = this.options.editModel.indices;
		if (!obj) {
			return null
		} else {
			return $.extend({}, obj)
		}
	};
	fn.getEditCellData = function() {
		var o = this.options,
			EM = o.editModel,
			obj = EM.indices;
		if (!obj) {
			return null
		}
		var colIndx = obj.colIndx,
			column = this.colModel[colIndx],
			editor = this.getEditor(obj),
			ed_valueIndx = editor.valueIndx,
			ed_labelIndx = editor.labelIndx,
			ed_mapIndices = editor.mapIndices || {},
			dataIndx = column.dataIndx,
			$cell = this.$div_focus,
			dataCell, getData = editor.getData;
		if (getData) {
			dataCell = this.callFn(getData, obj)
		} else {
			var edtype = editor.type;
			if (edtype == "checkbox") {
				var $ele = $cell.children();
				if (editor.subtype == "triple") {
					dataCell = $ele.pqval()
				} else {
					dataCell = $ele.is(":checked") ? true : false
				}
			} else {
				var $ed = $cell.find('*[name="' + dataIndx + '"]');
				if ($ed && $ed.length) {
					if (edtype == "select" && ed_valueIndx != null) {
						if (!ed_mapIndices[ed_valueIndx] && !this.columns[ed_valueIndx]) {
							dataCell = $ed.val()
						} else {
							dataCell = {};
							dataCell[ed_mapIndices[ed_valueIndx] ? ed_mapIndices[ed_valueIndx] : ed_valueIndx] = $ed.val();
							dataCell[ed_mapIndices[ed_labelIndx] ? ed_mapIndices[ed_labelIndx] : ed_labelIndx] = $ed.find("option:selected").text();
							var dataMap = editor.dataMap;
							if (dataMap) {
								var jsonMap = $ed.find("option:selected").data("map");
								if (jsonMap) {
									for (var k = 0; k < dataMap.length; k++) {
										var key = dataMap[k];
										dataCell[ed_mapIndices[key] ? ed_mapIndices[key] : key] = jsonMap[key]
									}
								}
							}
						}
					} else {
						dataCell = $ed.val()
					}
				} else {
					var $ed = $cell.find(".pq-editor-focus");
					if ($ed && $ed.length) {
						dataCell = $ed.val()
					}
				}
			}
			dataCell = this.deformat(dataCell, "Edit", column)
		}
		return dataCell
	};
	fn.getCellIndices = function(objP) {
		var $td = objP.$td,
			arr, obj = {},
			ri;
		if ($td && $td.length && $td.closest(".pq-body-outer")[0] == this.$cont[0]) {
			arr = this.iRenderB.getCellIndx($td[0]);
			if (arr) {
				ri = arr[0] + this.riOffset;
				obj = this.iMerge.getRootCellO(ri, arr[1], true)
			}
		}
		return obj
	};
	fn.getRowsByClass = function(obj) {
		var options = this.options,
			DM = options.dataModel,
			PM = options.pageModel,
			remotePaging = PM.type == "remote",
			offset = this.riOffset,
			data = DM.data,
			rows = [];
		if (data == null) {
			return rows
		}
		for (var i = 0, len = data.length; i < len; i++) {
			var rd = data[i];
			if (rd.pq_rowcls) {
				obj.rowData = rd;
				if (this.hasClass(obj)) {
					var row = {
							rowData: rd
						},
						ri = remotePaging ? i + offset : i,
						rip = ri - offset;
					row.rowIndx = ri;
					row.rowIndxPage = rip;
					rows.push(row)
				}
			}
		}
		return rows
	};
	fn.getCellsByClass = function(obj) {
		var that = this,
			options = this.options,
			DM = options.dataModel,
			PM = options.pageModel,
			remotePaging = PM.type == "remote",
			offset = this.riOffset,
			data = DM.data,
			cells = [];
		if (data == null) {
			return cells
		}
		for (var i = 0, len = data.length; i < len; i++) {
			var rd = data[i],
				ri = remotePaging ? i + offset : i,
				cellcls = rd.pq_cellcls;
			if (cellcls) {
				for (var di in cellcls) {
					var ui = {
						rowData: rd,
						rowIndx: ri,
						dataIndx: di,
						cls: obj.cls
					};
					if (that.hasClass(ui)) {
						var cell = that.normalize(ui);
						cells.push(cell)
					}
				}
			}
		}
		return cells
	};
	fn.data = function(objP) {
		var obj = this.normalize(objP),
			dataIndx = obj.dataIndx,
			data = obj.data,
			readOnly = data == null || pq.isStr(data) ? true : false,
			rowData = obj.rowData;
		if (!rowData) {
			return {
				data: null
			}
		}
		if (dataIndx == null) {
			var rowdata = rowData.pq_rowdata;
			if (readOnly) {
				var ret;
				if (rowdata != null) {
					if (data == null) {
						ret = rowdata
					} else {
						ret = rowdata[data]
					}
				}
				return {
					data: ret
				}
			}
			var finalData = $.extend(true, rowData.pq_rowdata, data);
			rowData.pq_rowdata = finalData
		} else {
			var celldata = rowData.pq_celldata;
			if (readOnly) {
				if (celldata != null) {
					var a = celldata[dataIndx];
					if (data == null || a == null) {
						ret = a
					} else {
						ret = a[data]
					}
				}
				return {
					data: ret
				}
			}
			if (!celldata) {
				rowData.pq_celldata = {}
			}
			finalData = $.extend(true, rowData.pq_celldata[dataIndx], data);
			rowData.pq_celldata[dataIndx] = finalData
		}
	};
	fn.attr = function(objP) {
		var rowIndx = objP.rowIndx,
			colIndx = objP.colIndx,
			dataIndx = colIndx != null ? this.colModel[colIndx].dataIndx : objP.dataIndx,
			attr = objP.attr,
			readOnly = attr == null || pq.isStr(attr) ? true : false,
			refresh = objP.refresh,
			finalAttr, ret, rowData = objP.rowData || this.getRowData(objP);
		if (!rowData) {
			return {
				attr: null
			}
		}
		if (!readOnly && refresh !== false && rowIndx == null) {
			rowIndx = this.getRowIndx({
				rowData: rowData
			}).rowIndx
		}
		if (dataIndx == null) {
			var rowattr = rowData.pq_rowattr;
			if (readOnly) {
				if (rowattr != null) {
					if (attr == null) {
						ret = rowattr
					} else {
						ret = rowattr[attr]
					}
				}
				return {
					attr: ret
				}
			}
			finalAttr = $.extend(true, rowData.pq_rowattr, attr);
			rowData.pq_rowattr = finalAttr;
			if (refresh !== false && rowIndx != null) {
				this.refreshRow({
					rowIndx: rowIndx
				})
			}
		} else {
			var cellattr = rowData.pq_cellattr;
			if (readOnly) {
				if (cellattr != null) {
					var a = cellattr[dataIndx];
					if (attr == null || a == null) {
						ret = a
					} else {
						ret = a[attr]
					}
				}
				return {
					attr: ret
				}
			}
			if (!cellattr) {
				rowData.pq_cellattr = {}
			}
			finalAttr = $.extend(true, rowData.pq_cellattr[dataIndx], attr);
			rowData.pq_cellattr[dataIndx] = finalAttr;
			if (refresh !== false && rowIndx != null) {
				this.refreshCell({
					rowIndx: rowIndx,
					dataIndx: dataIndx
				})
			}
		}
	};
	fn.processAttr = function(attr, style) {
		var key, val, str = "";
		if (pq.isStr(attr)) str = attr;
		else if (attr) {
			for (key in attr) {
				val = attr[key];
				if (val) {
					if (key == "title") {
						val = val.replace(/"/g, "&quot;")
					} else if (key == "style") {
						style && pq.styleObj(val, style);
						continue
					} else {
						if (typeof val == "object") {
							val = JSON.stringify(val)
						}
					}
					str += key + '="' + val + '"'
				}
			}
		}
		return str
	};
	fn.removeData = function(objP) {
		var colIndx = objP.colIndx,
			dataIndx = colIndx != null ? this.colModel[colIndx].dataIndx : objP.dataIndx,
			data = objP.data,
			data = data == null ? [] : data,
			datas = typeof data == "string" ? data.split(" ") : data,
			datalen = datas.length,
			rowData = objP.rowData || this.getRowData(objP);
		if (!rowData) {
			return
		}
		if (dataIndx == null) {
			var rowdata = rowData.pq_rowdata;
			if (rowdata) {
				if (datalen) {
					for (var i = 0; i < datalen; i++) {
						var key = datas[i];
						delete rowdata[key]
					}
				}
				if (!datalen || $.isEmptyObject(rowdata)) {
					delete rowData.pq_rowdata
				}
			}
		} else {
			var celldata = rowData.pq_celldata;
			if (celldata && celldata[dataIndx]) {
				var a = celldata[dataIndx];
				if (datalen) {
					for (var i = 0; i < datalen; i++) {
						var key = datas[i];
						delete a[key]
					}
				}
				if (!datalen || $.isEmptyObject(a)) {
					delete celldata[dataIndx]
				}
			}
		}
	};
	fn.removeAttr = function(objP) {
		var rowIndx = objP.rowIndx,
			dataIndx = objP.dataIndx,
			colIndx = objP.colIndx,
			dataIndx = colIndx != null ? this.colModel[colIndx].dataIndx : dataIndx,
			attr = objP.attr,
			attr = attr == null ? [] : attr,
			attrs = typeof attr == "string" ? attr.split(" ") : attr,
			attrlen = attrs.length,
			rowIndxPage = rowIndx - this.riOffset,
			refresh = objP.refresh,
			rowData = objP.rowData || this.getRowData(objP);
		if (!rowData) {
			return
		}
		if (refresh !== false && rowIndx == null) {
			rowIndx = this.getRowIndx({
				rowData: rowData
			}).rowIndx
		}
		if (dataIndx == null) {
			var rowattr = rowData.pq_rowattr;
			if (rowattr) {
				if (attrlen) {
					for (var i = 0; i < attrlen; i++) {
						var key = attrs[i];
						delete rowattr[key]
					}
				} else {
					for (key in rowattr) {
						attrs.push(key)
					}
				}
				if (!attrlen || $.isEmptyObject(rowattr)) {
					delete rowData.pq_rowattr
				}
			}
			if (refresh !== false && rowIndx != null && attrs.length) {
				attr = attrs.join(" ");
				var $tr = this.getRow({
					rowIndxPage: rowIndxPage
				});
				if ($tr) {
					$tr.removeAttr(attr)
				}
			}
		} else {
			var cellattr = rowData.pq_cellattr;
			if (cellattr && cellattr[dataIndx]) {
				var a = cellattr[dataIndx];
				if (attrlen) {
					for (i = 0; i < attrlen; i++) {
						key = attrs[i];
						delete a[key]
					}
				} else {
					for (key in a) {
						attrs.push(key)
					}
				}
				if (!attrlen || $.isEmptyObject(a)) {
					delete cellattr[dataIndx]
				}
			}
			if (refresh !== false && rowIndx != null && attrs.length) {
				attr = attrs.join(" ");
				var $td = this.getCell({
					rowIndxPage: rowIndxPage,
					dataIndx: dataIndx
				});
				if ($td) {
					$td.removeAttr(attr)
				}
			}
		}
	};
	fn.normalize = function(ui, data) {
		var obj = {},
			offset, CM, key;
		for (key in ui) {
			obj[key] = ui[key]
		}
		var ri = obj.rowIndx,
			rip = obj.rowIndxPage,
			di = obj.dataIndx,
			ci = obj.colIndx;
		if (rip != null || ri != null) {
			offset = this.riOffset;
			ri = ri == null ? rip * 1 + offset : ri;
			rip = rip == null ? ri * 1 - offset : rip;
			obj.rowIndx = ri;
			obj.rowIndxPage = rip;
			obj.rowData = obj.rowData || data && data[ri] || this.getRowData(obj)
		}
		if (ci != null || di != null) {
			CM = this.colModel;
			di = di == null ? CM[ci] ? CM[ci].dataIndx : undefined : di, ci = ci == null ? this.colIndxs[di] : ci;
			obj.column = CM[ci];
			obj.colIndx = ci;
			obj.dataIndx = di
		}
		return obj
	};
	fn.normalizeList = function(list) {
		var self = this,
			data = self.get_p_data();
		return list.map(function(rObj) {
			return self.normalize(rObj, data)
		})
	};
	fn.isSortable = function(column) {
		if (column) return column.dataIndx != null && this.options.sortModel.on && column.sortable != false
	};
	fn.addClassHead = function(ui) {
		var $cell = this.getCellHeader(ui),
			obj = this._getHeadIndices(ui.ri, ui.colIndx),
			col = obj.column || {},
			clsName = obj.filterRow ? "clsFilter" : "clsHead",
			clsHead = col[clsName],
			newcls = (clsHead ? clsHead + " " : "") + ui.cls;
		newcls = pq.arrayUnique(newcls.split(/\s+/)).join(" ");
		col[clsName] = newcls;
		$cell.addClass(ui.cls)
	};
	fn.removeClassHead = function(ui) {
		if (ui.cls) {
			var $cell = this.getCellHeader(ui),
				obj = this._getHeadIndices(ui.ri, ui.colIndx),
				col = obj.column || {},
				clsName = obj.filterRow ? "clsFilter" : "clsHead",
				oldcls = col[clsName] || "",
				clsArr = ui.cls.split(/\s+/),
				newcls = oldcls.split(/\s+/).filter(function(cls) {
					return cls && clsArr.indexOf(cls) == -1
				});
			col[clsName] = newcls.join(" ");
			$cell.removeClass(ui.cls)
		}
	};
	fn.addClass = function(_objP) {
		var objP = this.normalize(_objP),
			rip = objP.rowIndxPage,
			dataIndx = objP.dataIndx,
			uniqueArray = pq.arrayUnique,
			objcls = objP.cls,
			newcls, refresh = objP.refresh,
			rowData = objP.rowData;
		if (!rowData) {
			return
		}
		if (refresh !== false && rip == null) {
			rip = this.getRowIndx({
				rowData: rowData
			}).rowIndxPage
		}
		if (dataIndx == null) {
			var rowcls = rowData.pq_rowcls;
			if (rowcls) {
				newcls = rowcls + " " + objcls
			} else {
				newcls = objcls
			}
			newcls = uniqueArray(newcls.split(/\s+/)).join(" ");
			rowData.pq_rowcls = newcls;
			if (refresh !== false && rip != null && this.SelectRow().inViewRow(rip)) {
				var $tr = this.getRow({
					rowIndxPage: rip
				});
				if ($tr) {
					$tr.addClass(objcls)
				}
			}
		} else {
			var dataIndxs = [];
			if (typeof dataIndx.push != "function") {
				dataIndxs.push(dataIndx)
			} else {
				dataIndxs = dataIndx
			}
			var pq_cellcls = rowData.pq_cellcls;
			if (!pq_cellcls) {
				pq_cellcls = rowData.pq_cellcls = {}
			}
			for (var j = 0, len = dataIndxs.length; j < len; j++) {
				dataIndx = dataIndxs[j];
				var cellcls = pq_cellcls[dataIndx];
				if (cellcls) {
					newcls = cellcls + " " + objcls
				} else {
					newcls = objcls
				}
				newcls = uniqueArray(newcls.split(/\s+/)).join(" ");
				pq_cellcls[dataIndx] = newcls;
				if (refresh !== false && rip != null && this.SelectRow().inViewRow(rip)) {
					var $td = this.getCell({
						rowIndxPage: rip,
						dataIndx: dataIndx
					});
					if ($td) {
						$td.addClass(objcls)
					}
				}
			}
		}
	};
	fn.removeClass = function(_objP) {
		var objP = this.normalize(_objP),
			rowIndx = objP.rowIndx,
			rowData = objP.rowData,
			dataIndx = objP.dataIndx,
			cls = objP.cls,
			refresh = objP.refresh;

		function _removeClass(str, str2) {
			if (str && str2) {
				var arr = str.split(/\s+/),
					arr2 = str2.split(/\s+/),
					arr3 = [];
				for (var i = 0, len = arr.length; i < len; i++) {
					var cls = arr[i],
						found = false;
					for (var j = 0, len2 = arr2.length; j < len2; j++) {
						var cls2 = arr2[j];
						if (cls === cls2) {
							found = true;
							break
						}
					}
					if (!found) {
						arr3.push(cls)
					}
				}
				if (arr3.length > 1) {
					return arr3.join(" ")
				} else if (arr3.length === 1) {
					return arr3[0]
				} else {
					return null
				}
			}
		}
		if (!rowData) {
			return
		}
		var pq_cellcls = rowData.pq_cellcls,
			pq_rowcls = rowData.pq_rowcls;
		if (refresh !== false && rowIndx == null) {
			rowIndx = this.getRowIndx({
				rowData: rowData
			}).rowIndx
		}
		if (dataIndx == null) {
			if (pq_rowcls) {
				rowData.pq_rowcls = _removeClass(pq_rowcls, cls);
				if (rowIndx != null && refresh !== false) {
					var $tr = this.getRow({
						rowIndx: rowIndx
					});
					if ($tr) {
						$tr.removeClass(cls)
					}
				}
			}
		} else if (pq_cellcls) {
			var dataIndxs = [];
			if (typeof dataIndx.push != "function") {
				dataIndxs.push(dataIndx)
			} else {
				dataIndxs = dataIndx
			}
			for (var i = 0, len = dataIndxs.length; i < len; i++) {
				dataIndx = dataIndxs[i];
				var cellClass = pq_cellcls[dataIndx];
				if (cellClass) {
					rowData.pq_cellcls[dataIndx] = _removeClass(cellClass, cls);
					if (rowIndx != null && refresh !== false) {
						var $td = this.getCell({
							rowIndx: rowIndx,
							dataIndx: dataIndx
						});
						if ($td) {
							$td.removeClass(cls)
						}
					}
				}
			}
		}
	};
	fn.hasClass = function(obj) {
		var dataIndx = obj.dataIndx,
			cls = obj.cls,
			rowData = this.getRowData(obj),
			re = new RegExp("\\b" + cls + "\\b"),
			str;
		if (rowData) {
			if (dataIndx == null) {
				str = rowData.pq_rowcls;
				if (str && re.test(str)) {
					return true
				} else {
					return false
				}
			} else {
				var objCls = rowData.pq_cellcls;
				if (objCls && objCls[dataIndx] && re.test(objCls[dataIndx])) {
					return true
				} else {
					return false
				}
			}
		} else {
			return null
		}
	};
	fn.getRowIndx = function(obj) {
		var $tr = obj.$tr,
			rowData = obj.rowData,
			rowIndxPage, rowIndx, ri, offset = this.riOffset;
		if (rowData) {
			if ((ri = rowData.pq_ri) != null) {
				return {
					rowData: rowData,
					rowIndx: ri,
					rowIndxPage: ri - offset
				}
			}
			var data = this.get_p_data(),
				uf = false,
				dataUF = obj.dataUF ? this.options.dataModel.dataUF : null,
				_found = false;
			if (data) {
				for (var i = 0, len = data.length; i < len; i++) {
					if (data[i] == rowData) {
						_found = true;
						break
					}
				}
			}
			if (!_found && dataUF) {
				uf = true;
				i = 0;
				len = dataUF.length;
				for (; i < len; i++) {
					if (dataUF[i] == rowData) {
						_found = true;
						break
					}
				}
			}
			if (_found) {
				rowIndxPage = i - offset;
				rowIndx = i;
				return {
					rowIndxPage: uf ? undefined : rowIndxPage,
					uf: uf,
					rowIndx: rowIndx,
					rowData: rowData
				}
			} else {
				return {}
			}
		} else {
			if ($tr == null || $tr.length == 0) {
				return {}
			}
			rowIndxPage = this.iRenderB.getRowIndx($tr[0])[0];
			if (rowIndxPage == null) {
				return {}
			}
			return {
				rowIndxPage: rowIndxPage,
				rowIndx: rowIndxPage + offset
			}
		}
	};
	fn.search = function(ui) {
		var o = this.options,
			row = ui.row,
			first = ui.first,
			DM = o.dataModel,
			PM = o.pageModel,
			paging = PM.type,
			rowList = [],
			offset = this.riOffset,
			remotePaging = paging == "remote",
			data = DM.data;
		for (var i = 0, len = data.length; i < len; i++) {
			var rowData = data[i],
				_found = true;
			for (var dataIndx in row) {
				if (row[dataIndx] !== rowData[dataIndx]) {
					_found = false
				}
			}
			if (_found) {
				var ri = remotePaging ? i + offset : i,
					obj = this.normalize({
						rowIndx: ri
					});
				rowList.push(obj);
				if (first) {
					break
				}
			}
		}
		return rowList
	};
	fn._getFirstRC = function(view, data, freezeRows, initV, hidden) {
		var data = this[data],
			i = 0,
			fr = this.options[freezeRows],
			init = view ? this.iRenderB[initV] : fr,
			len = data.length;
		for (; i < len; i++) {
			if (i == fr && i < init) {
				i = init
			}
			if (!data[i][hidden]) {
				return i
			}
		}
	};
	fn.getFirstVisibleRIP = function(view) {
		return this._getFirstRC(view, "pdata", "freezeRows", "initV", "pq_hidden")
	};
	fn.getFirstVisibleCI = function(view) {
		return this._getFirstRC(view, "colModel", "freezeCols", "initH", "hidden")
	};
	fn.getLastVisibleRIP = function() {
		var data = this.pdata,
			rd, i = data.length - 1;
		for (; i >= 0; i--) {
			rd = data[i];
			if (rd && !rd.pq_hidden) {
				return i
			}
		}
	};
	fn.getLastVisibleCI = function() {
		return this.iCols.getLastVisibleCI()
	};
	fn.getNextVisibleCI = function(ci) {
		return this.iCols.getNextVisibleCI(ci)
	};
	fn.getPrevVisibleCI = function(ci) {
		return this.iCols.getPrevVisibleCI(ci)
	};
	fn.getPrevVisibleRIP = function(rip) {
		return this.iKeyNav.getPrevVisibleRIP(rip)
	};
	fn.getNextVisibleRIP = function(rip) {
		return this.iKeyNav.getNextVisibleRIP(rip)
	};
	fn.KeyNav = function() {
		return this.iKeyNav
	};
	fn.calcWidthCols = function(colIndx1, colIndx2) {
		var wd = 0,
			o = this.options,
			column, numberCell = o.numberCell,
			CM = this.colModel;
		if (colIndx1 == -1) {
			if (numberCell.show) {
				wd += numberCell.width * 1
			}
			colIndx1 = 0
		}
		for (var i = colIndx1; i < colIndx2; i++) {
			column = CM[i];
			if (column && !column.hidden) {
				if (!column._width) {
					throw "assert failed"
				}
				wd += column._width
			}
		}
		return wd
	}
})(jQuery);
(function($) {
	var cKeyNav = $.paramquery.cKeyNav = function(that) {
		var self = this,
			$fm = that.$focusMgr;
		self.that = that;

		function focusMgr(part) {
			that["$focusMgr" + part].on("focusin", self["onFocus" + part].bind(self)).on("focusout", self["onBlur" + part].bind(self))
		}
		focusMgr("Head");
		focusMgr("");
		that.on("headerKeyDown", self.headKeyDown.bind(self));
		$fm.on("keydown", function(evt) {
			if (pq.isCtrl(evt)) self.ctrlKeyDown = true
		}).on("keyup", function(evt) {
			self.ctrlKeyDown = false
		});
		if (that.options.editModel.pressToEdit) $fm.on("input", self.onInput.bind(self));
		var fe, feHead;
		Object.defineProperties(self, {
			fe: {
				get: function() {
					return fe
				},
				set: function(val) {
					fe = val
				}
			},
			feHead: {
				get: function() {
					return feHead
				},
				set: function(val) {
					feHead = val
				}
			}
		})
	};
	cKeyNav.prototype = {
		onFocusHead: function(evt) {
			this.onFocus(evt, true)
		},
		onFocus: function(evt, isHead) {
			var self = this,
				that = self.that,
				target = evt.target,
				isBody = !isHead,
				bodyHeadStr = isBody ? "" : "Head",
				hlen = that.options.showHeader == false ? 0 : that.iRenderHead.data.length,
				ri = hlen ? 0 : null,
				$focusMgr = that["$focusMgr" + bodyHeadStr],
				$focusSibling, firstFocused, _fvci, fvci = function() {
					if (_fvci == null) _fvci = that.getFirstVisibleCI();
					return _fvci
				},
				ui;
			if ($focusMgr.filter(":visible").length == 2) {
				firstFocused = $focusMgr[0] == target.parentNode;
				ui = firstFocused ? isBody ? {
					rowIndxPage: that.getFirstVisibleRIP(),
					colIndx: fvci()
				} : {
					colIndx: fvci(),
					ri: ri
				} : isBody ? {
					rowIndxPage: that.getLastVisibleRIP(),
					colIndx: fvci()
				} : {
					colIndx: fvci(),
					ri: ri
				};
				if (isHead && ri == null || isBody && ui.rowIndxPage == null || ui.colIndx == null) {
					$focusSibling = $($focusMgr[firstFocused ? 1 : 0]);
					$focusSibling.hide();
					pq.focusEle(!firstFocused);
					$focusSibling.show()
				} else {
					self["focus" + bodyHeadStr](ui);
					isBody && self.cSelect(ui.rowIndxPage, ui.colIndx)
				}
			}
		},
		cSelect: function(rip, ci) {
			var that = this.that,
				offset = that.riOffset;
			if (that.options.selectionModel.type == "cell") {
				that.Range({
					r1: rip + offset,
					c1: ci
				}).select()
			}
		},
		onBlurHead: function(evt) {
			this.onBlur(evt, true)
		},
		onBlur: function(evt, isHead) {
			var self = this,
				target = evt.target,
				isBody = !isHead,
				bodyHeadStr = isBody ? "" : "Head",
				fePart = "fe" + bodyHeadStr,
				fe = self[fePart],
				ignoreBlur = self["_ignoreBlur" + bodyHeadStr],
				that = self.that;
			if (document.activeElement != target && !ignoreBlur && !$(evt.currentTarget).is(".pq-editor-outer")) {
				if (fe) {
					self.removeClass(fe, bodyHeadStr);
					self[fePart] = null
				}
				that["$focusMgr" + bodyHeadStr].show();
				that._trigger("blur" + bodyHeadStr, evt, fe)
			}
		},
		focusHead: function(ui) {
			this.focus(ui, true)
		},
		resetFocusMgr: function($focusMgr, editor, editable, isHead) {
			editor = editor || {};
			var $child, edtype = {
					textbox: "input",
					textarea: "textarea",
					contenteditable: "div[contenteditable]"
				} [editor.type] || "textarea",
				attr = editor.attr || "";
			$focusMgr.html({
				input: "<input " + attr + (attr.includes("type") ? "" : " type='text'") + "/>",
				textarea: "<textarea " + attr + "></textarea>",
				"div[contenteditable]": "<div contenteditable='true' tabindex='0' " + attr + "></div>"
			} [edtype]);
			$child = $focusMgr.children();
			if (!editable || "ontouchstart" in window) {
				$child.attr($child.is("div") ? {
					contenteditable: false
				} : {
					readonly: true
				})
			}
			$focusMgr[0].className = "pq-focus-mgr" + (isHead ? " pq-focus-mgr-head" : "");
			return $child
		},
		ignoreBlur: function(fn, bodyHeadStr) {
			bodyHeadStr = bodyHeadStr || "";
			this["_ignoreBlur" + bodyHeadStr] = true;
			fn();
			this["_ignoreBlur" + bodyHeadStr] = false
		},
		focus: function(ui, isHead) {
			ui = ui || {};
			var self = this,
				that = self.that,
				isBody = !isHead,
				$cell, cell, bodyHeadStr = isBody ? "" : "Head",
				focusMgr, $focusMgr = that["$focusMgr" + bodyHeadStr],
				fePart = "fe" + bodyHeadStr,
				iM = that.iMerge,
				indexHide = 1,
				indexShow = 0,
				evt = ui.evt,
				body = ui.body,
				ri, rip, ci, cord, pdata = isBody ? that.pdata : that.iRenderHead.data,
				pos, $cont = that.$cont,
				rect1, rect2, noscroll = ui.noscroll,
				pageX, pageY, fe = self[fePart];
			if (that.$div_focus) {
				if (that.saveEditCell()) that.quitEditMode();
				else return
			}

			function showHideFM() {
				$($focusMgr[indexHide]).hide();
				focusMgr = $focusMgr[indexShow];
				$focusMgr = $(focusMgr);
				$focusMgr.show()
			}
			if (!body) {
				if (isBody) {
					rip = ui.rowIndxPage;
					if (rip == null) rip = ui.rowIndxPage = that.getFirstVisibleRIP(true);
					if (rip != null) ri = rip + that.riOffset
				} else if (isHead) {
					ri = ui.ri;
					if (ri == null) ri = ui.ri = pdata.length - 1
				}
				ci = ui.colIndx;
				if (ci == null || ci == -1) ci = ui.colIndx = that.getFirstVisibleCI(true)
			}
			if (ri >= 0 && ci >= 0) {
				if (isBody) {
					if (self.isLastFocusableCell(ui)) {
						indexHide = 0;
						indexShow = 1
					}
					if (iM.ismergedCell(ri, ci)) {
						cord = iM.getRootCellO(ri, ci);
						rip = ui.rowIndxPage = cord.rowIndxPage;
						ci = ui.colIndx = cord.colIndx
					}
				}

				function onScroll() {
					self.removeClass(fe, bodyHeadStr);
					ui.cls = "pq-focus" + (that.options.noBorderFocus ? " pq-no-border" : "");
					that["addClass" + bodyHeadStr](ui);
					self.ignoreBlur(function() {
						showHideFM();
						$cell = that[isBody ? "getCell" : "getCellHeader"](ui);
						cell = $cell[0];
						if (cell) {
							rect2 = pq.offset(cell, focusMgr.parentNode);
							$focusMgr.css({
								left: rect2.left,
								top: rect2.top
							});
							noscroll || self.scrollIntoView(focusMgr, cell.getBoundingClientRect())
						}
						fe = self[fePart] = ui;
						fe.cell = cell;
						self.resetFocusMgr($focusMgr, isBody ? that.getEditor(ui, ["type", "attr"]) : {}, isBody ? that.isEditable(ui) : "", isHead).focus()
					}, bodyHeadStr);
					if (cell) $cell.trigger("focusin");
					that._trigger("focus" + bodyHeadStr, null, fe)
				}
				if (noscroll) {
					onScroll()
				} else {
					isBody ? that.scrollCell({
						rowIndxPage: rip,
						colIndx: ci
					}, onScroll) : that.scrollColumn({
						colIndx: ci
					}, onScroll)
				}
			} else if (body) {
				showHideFM();
				self.removeClass(fe, bodyHeadStr);
				pageX = evt.offsetX;
				pageY = evt.offsetY;
				if (pageX && pageY) {
					$focusMgr.css({
						left: Math.max(0, pageX - 20),
						top: Math.max(0, pageY - 20)
					})
				}
				self.ignoreBlur(function() {
					self.resetFocusMgr($focusMgr).focus()
				});
				$cont.addClass("pq-focus");
				fe = self[fePart] = ui;
				that._trigger("focus" + bodyHeadStr, null, fe)
			}
		},
		removeClass: function(fe, bodyHeadStr) {
			var that = this.that;
			if (fe) {
				if (fe.body) {
					that.$cont.removeClass("pq-focus")
				} else {
					that["removeClass" + bodyHeadStr](fe);
					that.getCell(fe).trigger("focusout");
					that._trigger("blurCell" + bodyHeadStr, null, fe)
				}
			}
		},
		scrollIntoView: function(focusMgr, rect) {
			var obj = {
					behavior: "smooth"
				},
				move;
			if (rect.top < 0 || rect.bottom > window.innerHeight) {
				move = 1;
				obj.block = "center"
			} else if (rect.left < 0 || rect.right > window.innerWidth) {
				move = 1;
				obj.block = "nearest";
				obj.inline = "center"
			}
			move && focusMgr.scrollIntoView(obj)
		},
		isLastFocusableCell: function(ui) {
			var that = this.that;
			return that.getLastVisibleRIP() == ui.rowIndxPage && that.getLastVisibleCI() == ui.colIndx
		},
		getFocusHead: function() {
			return this.feHead
		},
		getFocus: function() {
			return this.fe
		},
		headKeyDown: function(evt, ui) {
			var self = this,
				keyCode = evt.keyCode,
				that = self.that,
				data = that.iRenderHead.data,
				dLen = data.length,
				fe = self.feHead;
			if (!fe) {
				return
			}
			var ri = fe.ri == null ? dLen - 1 : fe.ri,
				ci = fe.colIndx,
				column, columnPrev = data[ri] ? data[ri][ci] : null,
				KC = $.ui.keyCode,
				isUp = keyCode == KC.UP,
				isDown = keyCode == KC.DOWN,
				_isLeft = keyCode == KC.LEFT,
				_isRight = keyCode == KC.RIGHT,
				rtl = that.options.rtl,
				isLeft = _isLeft && !rtl || _isRight && rtl,
				isRight = _isLeft && rtl || _isRight && !rtl,
				isTab = keyCode == KC.TAB,
				isShift = evt.shiftKey,
				$cell = that.getCellHeader({
					ri: ri,
					colIndx: ci
				}),
				preventDefault, collapsible, $clickIcon, firstVisibleRIP, evt2, $inp;

			function selectCell() {
				self.focusHead({
					ri: ri,
					colIndx: ci
				})
			}
			if (that._trigger("beforeHeadKeyDown", evt, fe) == false) {
				return
			}
			if (keyCode == KC.ENTER) {
				if (pq.isCtrl(evt)) {
					if (($clickIcon = $cell.find(".pq-icon-menu,.pq-icon-filter")).length) {
						$clickIcon.click()
					}
				} else if (($clickIcon = $cell.find(".pq-icon-detail")).length) {
					$clickIcon.click()
				} else if (that.isSortable(columnPrev)) {
					evt2 = $.Event("click");
					evt2.shiftKey = evt.shiftKey;
					$cell.find(".pq-title-span").trigger(evt2)
				} else if (columnPrev && (collapsible = columnPrev.collapsible)) {
					collapsible.on = !collapsible.on;
					that.refreshCM();
					that.refresh();
					selectCell()
				} else {
					$inp = $cell.find("input,select,textarea");
					if ($inp.length) {
						$inp[0].focus()
					}
				}
			} else if (keyCode == KC.SPACE) {
				$cell.find("input").click();
				preventDefault = true
			} else if (isTab && isShift || isLeft) {
				do {
					ci = that.getPrevVisibleCI(ci - 1);
					column = data[ri][ci];
					if (ci == null) {
						if (ri > 0 && isTab) {
							ri--;
							ci = data[ri].length
						} else {
							break
						}
					} else if (!column || column != columnPrev) {
						selectCell();
						preventDefault = true;
						break
					}
				} while (true)
			} else if (isTab || isRight) {
				do {
					ci = that.getNextVisibleCI(ci + 1);
					column = data[ri] ? data[ri][ci] : null;
					if (ci == null) {
						if (isTab && ri < dLen - 1) {
							ri++;
							ci = -1
						} else {
							break
						}
					} else if (!column || column != columnPrev) {
						selectCell();
						preventDefault = true;
						break
					}
				} while (true)
			} else if (isDown || isUp) {
				do {
					isDown ? ri++ : ri--;
					if (!data[ri]) {
						if (isDown) {
							firstVisibleRIP = that.getFirstVisibleRIP();
							if (firstVisibleRIP != null) {
								that.focus({
									rowIndxPage: firstVisibleRIP,
									colIndx: ci
								});
								self.cSelect(firstVisibleRIP, ci)
							}
						}
						break
					}
					column = data[ri][ci];
					if (column != columnPrev) {
						selectCell();
						break
					}
				} while (true)
			}
			preventDefault && evt.preventDefault()
		},
		onInput: function(evt) {
			var self = this,
				that = self.that,
				fe = self.fe;
			if (self.ctrlKeyDown || !fe || fe.rowIndxPage == null || fe.colIndx == null) {
				return
			}
			var edtype = that.getEditor(fe, ["type"]).type,
				isSelect = edtype == "select";
			if (that.isEditable(fe) && edtype && !isSelect) {
				that.editCell($.extend({
					editByPress: true
				}, fe))
			}
		},
		bodyKeyDown: function(evt) {
			var self = this,
				that = self.that,
				offset = that.riOffset,
				rowIndx, rowIndxPage, colIndx, o = that.options,
				rtl = o.rtl,
				iM = that.iMerge,
				$target = $(evt.target),
				_fe = self.fe,
				CM = that.colModel,
				SM = o.selectionModel,
				EM = o.editModel,
				cont = that.$cont[0],
				focusInBody = $target[0] == cont,
				viewport, ctrlMeta = pq.isCtrl(evt),
				KC = $.ui.keyCode,
				KCLEFT = KC.LEFT,
				KCRIGHT = KC.RIGHT,
				KCTAB = KC.TAB,
				keyCode = evt.keyCode,
				is = function(kc) {
					return keyCode == kc
				},
				firstVCI = function() {
					return that.getFirstVisibleCI()
				},
				lastVCI = function() {
					return that.getLastVisibleCI()
				},
				firstVRI = function() {
					return that.getFirstVisibleRIP()
				},
				lastVRI = function() {
					return that.getLastVisibleRIP()
				},
				removeSel = function() {
					that.Selection().removeAll()
				},
				isLeft = is(KCLEFT),
				isRight = is(KCRIGHT),
				isHome = is(KC.HOME),
				isEnd = is(KC.END),
				isTab = is(KCTAB),
				isSpace = is(KC.SPACE),
				isPageUp = is(KC.PAGE_UP),
				isPageDown = is(KC.PAGE_DOWN),
				isShift = evt.shiftKey,
				isEnter = is(KC.ENTER),
				isTabS = isTab && isShift,
				isTabWS = isTab && !isShift,
				isUp = is(KC.UP),
				isDown = is(KC.DOWN);
			if (EM.indices) {
				that.$div_focus.find(".pq-cell-focus").focus();
				return
			}
			if (focusInBody && !_fe && isTabWS) {
				viewport = that.getViewPortIndx();
				that.focus({
					rowIndxPage: viewport.initV,
					colIndx: viewport.initH
				});
				return
			}
			if ($target.hasClass("pq-cell-editor")) {
				return
			}
			if (isSpace && focusInBody) {
				return false
			}
			if ($target.is("select,input") && !$target.parent().is(".pq-focus-mgr")) {
				return
			}
			var cell = that.normalize(_fe),
				$td, rowIndxPage = cell.rowIndxPage,
				rowIndx = cell.rowIndx,
				colIndx = cell.colIndx,
				pqN, rip2, pdata = that.pdata,
				rowData = cell.rowData,
				uiTrigger = cell,
				obj, preventDefault;
			if (rowIndx == null || colIndx == null || rowData == null) {
				return
			}
			if (iM.ismergedCell(rowIndx, colIndx)) {
				uiTrigger = iM.getRootCellO(rowIndx, colIndx);
				cell = uiTrigger;
				rowIndxPage = cell.rowIndxPage;
				rowIndx = cell.rowIndx;
				colIndx = cell.colIndx;
				if (isPageUp || isPageDown || isHome || isEnd) {
					if (pqN = iM.getData(rowIndx, colIndx, "proxy_cell")) {
						rip2 = pqN.rowIndx - offset;
						if (!pdata[rip2].pq_hidden) {
							rowIndxPage = rip2;
							rowIndx = rowIndxPage + offset
						}
					}
				}
				if (CM[colIndx].hidden) {
					colIndx = that.getNextVisibleCI(colIndx)
				}
			}
			if (that._trigger("beforeCellKeyDown", evt, uiTrigger) == false) {
				return false
			}
			that._trigger("cellKeyDown", evt, uiTrigger);
			if (isEnter) that._trigger("cellClickE", evt, uiTrigger);
			if (isHome || ctrlMeta && isLeft) {
				if (ctrlMeta && isHome) {
					rowIndx = firstVRI() + offset
				}
				colIndx = rtl ? lastVCI() : firstVCI();
				self.select(rowIndx, colIndx, evt);
				preventDefault = true
			} else if (isEnd || ctrlMeta && isRight) {
				if (ctrlMeta && isEnd) {
					rowIndx = lastVRI() + offset
				}
				colIndx = rtl ? firstVCI() : lastVCI();
				self.select(rowIndx, colIndx, evt);
				preventDefault = true
			} else if (isLeft || isRight || isUp || isDown || SM.onTab && isTab) {
				if ((isLeft && !rtl || isRight && rtl) && colIndx != firstVCI() || isTabS) {
					obj = self.incrIndx(rowIndxPage, colIndx, false)
				} else if ((isRight && !rtl || isLeft && rtl) && (colIndx != lastVCI() || o.autoAddCol) || isTabWS) {
					if (!isTab && o.autoAddCol && colIndx == lastVCI()) {
						that.Columns().add([{}])
					}
					if (isTabWS && colIndx == lastVCI() && (rowData.pq_detail || {}).show) {
						if (pq.focusEle(null, rowData.pq_detail.child)) {
							removeSel();
							preventDefault = true
						}
					} else {
						obj = self.incrIndx(rowIndxPage, colIndx, true);
						if (!obj && isTab) {
							var parent = that.parent(),
								focusEle = pq.getFocusEle(),
								rip;
							if (parent && parent.widget()[0].contains(focusEle)) {
								rip = parent.Detail().getRip(that.widget().closest(".pq-detail")[0]);
								obj = parent.KeyNav().incrIndx(rip, parent.getLastVisibleCI(), true);
								if (obj) {
									parent.focus(obj);
									parent.KeyNav().cSelect(obj.rowIndxPage, obj.colIndx);
									obj = null;
									preventDefault = true
								}
							}
						}
					}
				} else if (isUp) {
					if (ctrlMeta) obj = {
						rowIndxPage: firstVRI(),
						colIndx: colIndx
					};
					else obj = self.incrRowIndx(rowIndxPage, colIndx, false);
					if (obj.rowIndxPage == rowIndxPage) {
						self.focusHead({
							colIndx: colIndx
						});
						removeSel();
						obj = null
					}
				} else if (isDown) {
					if (ctrlMeta) obj = {
						rowIndxPage: lastVRI(),
						colIndx: colIndx
					};
					else {
						if (o.autoAddRow && rowIndxPage == lastVRI()) {
							that.addNodes([{}])
						}
						obj = self.incrRowIndx(rowIndxPage, colIndx, true)
					}
				}
				if (obj) {
					rowIndx = obj.rowIndxPage + offset;
					self.select(rowIndx, obj.colIndx, evt)
				} else if (preventDefault == null && isTab) {
					removeSel();
					preventDefault = false
				}
				if (preventDefault == null) preventDefault = true
			} else if (isPageDown || isPageUp) {
				that.iRenderB[isPageUp ? "pageUp" : "pageDown"](rowIndxPage, function(rip) {
					rowIndx = rip + offset;
					self.select(rowIndx, colIndx, evt)
				});
				preventDefault = true
			} else if (keyCode == KC.ENTER) {
				$td = that.getCell(uiTrigger);
				if ($td && $td[0]) {
					if (that.isEditable(uiTrigger)) {
						that.editCell(uiTrigger)
					} else {
						var $button = $td.find("button,input[type='radio']");
						if ($button[0]) {
							$($button[0]).click()
						}
					}
				}
				preventDefault = true
			} else if (ctrlMeta && keyCode == "65") {
				var iSel = that.iSelection;
				if (SM.type == "row" && SM.mode != "single") {
					that.iRows.toggleAll({
						all: SM.all
					})
				} else if (SM.type == "cell" && SM.mode != "single") {
					iSel.selectAll({
						type: "cell",
						all: SM.all
					})
				}
				preventDefault = true
			} else if (ctrlMeta) {
				preventDefault = false
			} else if (EM.pressToEdit && this.isEditKey(keyCode) && !ctrlMeta) {
				if (keyCode == 46) {
					that.clear()
				} else {
					if (that.getEditor(uiTrigger, ["type"]).type == "select") {
						rowIndxPage = uiTrigger.rowIndxPage;
						colIndx = uiTrigger.colIndx;
						$td = that.getCell(uiTrigger);
						if ($td && $td[0]) {
							if (that.isEditable(uiTrigger)) {
								that.editCell({
									rowIndxPage: rowIndxPage,
									colIndx: colIndx,
									select: true
								})
							}
						}
					}
					preventDefault = false
				}
				if (preventDefault == null) preventDefault = true
			}
			if (preventDefault) {
				evt.preventDefault()
			}
		},
		getPrevVisibleRIP: function(rowIndxPage) {
			var data = this.that.pdata;
			for (var i = rowIndxPage - 1; i >= 0; i--) {
				if (data[i] && !data[i].pq_hidden) {
					return i
				}
			}
			return rowIndxPage
		},
		setDataMergeCell: function(rowIndx, colIndx) {
			var that = this.that,
				iM = that.iMerge,
				obj, obj_o;
			if (iM.ismergedCell(rowIndx, colIndx)) {
				obj_o = iM.getRootCellO(rowIndx, colIndx);
				iM.setData(obj_o.rowIndx, obj_o.colIndx, {
					proxy_cell: {
						rowIndx: rowIndx,
						colIndx: colIndx
					}
				})
			}
		},
		getValText: function($editor) {
			var nodeName = $editor[0].nodeName.toLowerCase(),
				valsarr = ["input", "textarea", "select"],
				byVal = "text";
			if ($.inArray(nodeName, valsarr) != -1) {
				byVal = "val"
			}
			return byVal
		},
		getNextVisibleRIP: function(rowIndxPage) {
			var data = this.that.pdata;
			for (var i = rowIndxPage + 1, len = data.length; i < len; i++) {
				if (data[i] && !data[i].pq_hidden) {
					return i
				}
			}
			return rowIndxPage
		},
		incrEditIndx: function(rowIndxPage, colIndx, incr) {
			var that = this.that,
				CM = that.colModel,
				CMLength = CM.length,
				iM = that.iMerge,
				column, offset = that.riOffset,
				lastRowIndxPage = that[incr ? "getLastVisibleRIP" : "getFirstVisibleRIP"]();
			do {
				var rowIndx = rowIndxPage + offset,
					m;
				if (iM.ismergedCell(rowIndx, colIndx)) {
					m = iM.getRootCell(rowIndx, colIndx);
					var pqN = iM.getData(rowIndx, colIndx, "proxy_edit_cell");
					if (pqN) {
						rowIndx = pqN.rowIndx;
						rowIndxPage = rowIndx - offset
					}
					colIndx = incr ? colIndx + m.o_cc : colIndx - 1
				} else {
					colIndx = incr ? colIndx + 1 : colIndx - 1
				}
				if (incr && colIndx >= CMLength || !incr && colIndx < 0) {
					if (rowIndxPage == lastRowIndxPage) {
						return null
					}
					rowIndxPage = this[incr ? "getNextVisibleRIP" : "getPrevVisibleRIP"](rowIndxPage);
					colIndx = incr ? 0 : CMLength - 1
				}
				rowIndx = rowIndxPage + offset;
				if (iM.ismergedCell(rowIndx, colIndx)) {
					m = iM.getRootCellO(rowIndx, colIndx);
					iM.setData(m.rowIndx, m.colIndx, {
						proxy_edit_cell: {
							rowIndx: rowIndx,
							colIndx: colIndx
						}
					});
					rowIndx = m.rowIndx;
					colIndx = m.colIndx
				}
				column = CM[colIndx];
				var isEditableCell = that.isEditable({
						rowIndx: rowIndx,
						colIndx: colIndx
					}),
					ceditor = column.editor,
					ceditor = typeof ceditor == "function" ? ceditor.call(that, that.normalize({
						rowIndx: rowIndx,
						colIndx: colIndx
					})) : ceditor;
				rowIndxPage = rowIndx - offset
			} while (column && (column.hidden || isEditableCell == false || ceditor === false));
			return {
				rowIndxPage: rowIndxPage,
				colIndx: colIndx
			}
		},
		incrIndx: function(rip, ci, incr) {
			var that = this.that,
				skipFocus = that.options.skipFocus,
				iM = that.iMerge,
				m, pqN, rowIndx, rip2, column, obj, rowIndxPage = rip,
				colIndx = ci,
				pdata = that.pdata,
				offset = that.riOffset,
				incrV = "get" + (incr ? "Last" : "First") + "Visible",
				lastRowIndxPage = that[incrV + "RIP"](),
				lastColIndx = that[incrV + "CI"](),
				CM = that.colModel,
				CMLength = CM.length;
			if (colIndx == null) {
				if (rowIndxPage != lastRowIndxPage) {
					rowIndxPage = this[incr ? "getNextVisibleRIP" : "getPrevVisibleRIP"](rowIndxPage);
					obj = {
						rowIndxPage: rowIndxPage
					}
				}
			} else if (colIndx == lastColIndx) {
				obj = this.incrRowIndx(rowIndxPage, colIndx, incr);
				if (obj.rowIndxPage != rowIndxPage) {
					obj.colIndx = that["get" + (incr ? "First" : "Last") + "VisibleCI"]()
				}
			} else {
				do {
					rowIndx = rowIndxPage + offset;
					if (iM.ismergedCell(rowIndx, colIndx)) {
						m = iM.getRootCell(rowIndx, colIndx);
						if (!column && (pqN = iM.getData(m.o_ri, m.o_ci, "proxy_cell"))) {
							rip2 = pqN.rowIndx - offset;
							if (!pdata[rip2].pq_hidden) {
								rowIndxPage = rip2
							}
						}
						if (pdata[rowIndxPage].pq_hidden) {
							rowIndxPage = iM.getRootCellV(rowIndx, colIndx).rowIndxPage
						}
						if (!column && incr) {
							colIndx = m.o_ci + (m.o_cc ? m.o_cc - 1 : 0)
						}
					}
					if (incr) {
						if (colIndx < CMLength - 1) colIndx++;
						else {
							colIndx = ci;
							break
						}
					} else {
						if (colIndx > 0) colIndx--;
						else {
							colIndx = ci;
							break
						}
					}
					column = CM[colIndx]
				} while (column && (column.hidden || column.skipFocus || skipFocus && skipFocus.call(that, rowIndx, colIndx)));
				obj = {
					rowIndxPage: rowIndxPage,
					colIndx: colIndx
				}
			}
			if (obj.rowIndxPage != rip || obj.colIndx != ci) return obj
		},
		incrRowIndx: function(rip, ci, incr) {
			var that = this.that,
				offset = that.riOffset,
				ri = rip + offset,
				iM = that.iMerge,
				m, pqN;
			if (iM.ismergedCell(ri, ci)) {
				m = iM.getRootCell(ri, ci);
				pqN = iM.getData(m.o_ri, m.o_ci, "proxy_cell");
				if (incr) rip = m.o_ri - offset + m.o_rc - 1;
				ci = pqN ? pqN.colIndx : m.v_ci
			}
			rip = this["get" + (incr ? "Next" : "Prev") + "VisibleRIP"](rip);
			return {
				rowIndxPage: rip,
				colIndx: ci
			}
		},
		isEditKey: function(keyCode) {
			return keyCode >= 32 && keyCode <= 127 || keyCode == 189 || keyCode == 190 || keyCode == 187
		},
		keyDownInEdit: function(evt) {
			var that = this.that,
				o = that.options,
				EMIndx = o.editModel.indices;
			if (!EMIndx) {
				return
			}
			var $this = $(evt.target),
				keyCodes = $.ui.keyCode,
				keyCode, gEM = o.editModel,
				obj = $.extend({}, EMIndx),
				rowIndxPage = obj.rowIndxPage,
				colIndx = obj.colIndx,
				column = obj.column,
				cEM = column.editModel,
				EM = cEM ? $.extend({}, gEM, cEM) : gEM,
				byVal = this.getValText($this);
			$this.data("oldVal", $this[byVal]());
			if (that._trigger("editorKeyDown", evt, obj) == false) {
				return false
			}
			keyCode = evt.keyCode;
			if (keyCode == keyCodes.TAB || keyCode == EM.saveKey && !evt.altKey) {
				var onSave = keyCode == keyCodes.TAB ? EM.onTab : EM.onSave;
				if (onSave == "downFocus") {
					if (o.autoAddRow && rowIndxPage == that.getLastVisibleRIP()) {
						that.addNodes([{}])
					}
					obj = this.incrRowIndx(rowIndxPage, colIndx, !evt.shiftKey)
				} else {
					obj = {
						rowIndxPage: rowIndxPage,
						colIndx: colIndx,
						incr: onSave ? true : false,
						edit: onSave == "nextEdit"
					}
				}
				return this.saveAndMove(obj, evt)
			} else if (keyCode == keyCodes.ESCAPE) {
				that.quitEditMode({
					evt: evt
				});
				that.focus({
					rowIndxPage: rowIndxPage,
					colIndx: colIndx
				});
				evt.preventDefault();
				return false
			} else if (keyCode == keyCodes.PAGE_UP || keyCode == keyCodes.PAGE_DOWN) {
				evt.preventDefault();
				return false
			} else if (EM.keyUpDown && !evt.altKey) {
				if (keyCode == keyCodes.DOWN || keyCode == keyCodes.UP) {
					obj = this.incrRowIndx(rowIndxPage, colIndx, keyCode == keyCodes.DOWN);
					return this.saveAndMove(obj, evt)
				}
			}
		},
		keyPressInEdit: function(evt, _objP) {
			var that = this.that,
				o = that.options,
				EM = o.editModel,
				EMIndx = EM.indices,
				objP = _objP || {},
				FK = objP.FK,
				column = EMIndx.column,
				KC = $.ui.keyCode,
				allowedKeys = ["BACKSPACE", "LEFT", "RIGHT", "UP", "DOWN", "DELETE", "HOME", "END"].map(function(kc) {
					return KC[kc]
				}),
				dataType = column.dataType;
			if ($.inArray(evt.keyCode, allowedKeys) >= 0) {
				return true
			}
			if (that._trigger("editorKeyPress", evt, $.extend({}, EMIndx)) === false) {
				return false
			}
			if (FK && (dataType == "float" || dataType == "integer")) {
				var val = EMIndx.$editor.val(),
					charsAllow = EM.charsAllow[dataType == "float" ? 0 : 1],
					charC = evt.charCode || evt.keyCode,
					chr = String.fromCharCode(charC);
				if (val[0] !== "=" && chr && charsAllow.indexOf(chr) == -1) {
					return false
				}
			}
			return true
		},
		keyUpInEdit: function(evt, _objP) {
			var that = this.that,
				o = that.options,
				objP = _objP || {},
				FK = objP.FK,
				EM = o.editModel,
				EMIndices = EM.indices;
			that._trigger("editorKeyUp", evt, $.extend({}, EMIndices));
			var column = EMIndices.column,
				dataType = column.dataType;
			if (FK && (dataType == "float" || dataType == "integer")) {
				var $this = $(evt.target),
					re = dataType == "integer" ? EM.reInt : EM.reFloat,
					byVal = this.getValText($this),
					oldVal = $this.data("oldVal"),
					newVal = $this[byVal]();
				if (re.test(newVal) == false && newVal[0] !== "=") {
					if (re.test(oldVal)) {
						$this[byVal](oldVal)
					} else {
						var val = dataType == "float" ? parseFloat(oldVal) : parseInt(oldVal);
						if (isNaN(val)) {
							$this[byVal](0)
						} else {
							$this[byVal](val)
						}
					}
				}
			}
		},
		saveAndMove: function(objP, evt) {
			if (objP == null) {
				evt.preventDefault();
				return false
			}
			var self = this,
				that = self.that,
				rowIndx, obj, rowIndxPage = objP.rowIndxPage,
				colIndx = objP.colIndx;
			that._blurEditMode = true;
			if (that.saveEditCell({
					evt: evt
				}) === false || !that.pdata) {
				if (!that.pdata) {
					that.quitEditMode(evt)
				}
				that._deleteBlurEditMode({
					timer: true,
					msg: "saveAndMove saveEditCell"
				});
				evt.preventDefault();
				return false
			}
			that.quitEditMode(evt);
			if (objP.incr) {
				obj = self[objP.edit ? "incrEditIndx" : "incrIndx"](rowIndxPage, colIndx, !evt.shiftKey);
				rowIndxPage = obj ? obj.rowIndxPage : rowIndxPage;
				colIndx = obj ? obj.colIndx : colIndx
			}
			that.scrollCell({
				rowIndxPage: rowIndxPage,
				colIndx: colIndx
			}, function() {
				rowIndx = rowIndxPage + that.riOffset;
				self.select(rowIndx, colIndx, evt);
				if (objP.edit) {
					that._editCell({
						rowIndxPage: rowIndxPage,
						colIndx: colIndx
					})
				}
			});
			that._deleteBlurEditMode({
				timer: true,
				msg: "saveAndMove"
			});
			evt.preventDefault();
			return false
		},
		select: function(rowIndx, colIndx, evt) {
			var self = this,
				that = self.that,
				rowIndxPage = rowIndx - that.riOffset,
				objP = self.setDataMergeCell(rowIndx, colIndx),
				o = that.options,
				iSel = that.iSelection,
				SM = o.selectionModel,
				type = SM.type,
				type_row = type == "row",
				type_cell = type == "cell";
			that.scrollCell({
				rowIndx: rowIndx,
				colIndx: colIndx
			}, function() {
				var areas = iSel.address();
				if (evt.shiftKey && evt.keyCode !== $.ui.keyCode.TAB && SM.type && SM.mode != "single" && (areas.length || type_row)) {
					if (type_row) {
						that.iRows.extend({
							rowIndx: rowIndx,
							evt: evt
						})
					} else {
						var last = areas[areas.length - 1],
							firstR = last.firstR,
							firstC = last.firstC,
							lasttype = last.type,
							expand = false;
						if (lasttype == "column") {
							last.c1 = firstC;
							last.c2 = colIndx;
							last.r1 = last.r2 = last.type = last.cc = last.rc = undefined;
							that.Range(areas, expand).select()
						} else if (lasttype == "row") {
							iSel.resizeOrReplace({
								r1: firstR,
								r2: rowIndx,
								firstR: firstR,
								firstC: firstC
							})
						} else {
							iSel.resizeOrReplace({
								r1: firstR,
								c1: firstC,
								r2: rowIndx,
								c2: colIndx,
								firstR: firstR,
								firstC: firstC
							})
						}
					}
				} else {
					if (type_row) {} else if (type_cell) {
						that.Range({
							r1: rowIndx,
							c1: colIndx,
							firstR: rowIndx,
							firstC: colIndx
						}).select()
					}
				}
				that.focus({
					rowIndxPage: rowIndxPage,
					colIndx: colIndx
				})
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cGenerateView = _pq.cGenerateView = function() {};
	cGenerateView.prototype = {
		autoFitCols: function() {
			var that = this.that,
				CM = that.colModel,
				CMLength = CM.length,
				dims = this.dims,
				wdAllCols = that.calcWidthCols(-1, CMLength, true),
				sbWidth = this.getSBWd(),
				wdCont = dims.wdCenter - sbWidth;
			if (wdAllCols !== wdCont) {
				var diff = wdAllCols - wdCont,
					columnResized, availWds = [];
				for (var i = 0; i < CMLength; i++) {
					var column = CM[i],
						colPercent = column._percent,
						resizable = column.resizable !== false,
						resized = column._resized,
						hidden = column.hidden;
					if (!hidden && !colPercent && !resized) {
						var availWd;
						if (diff < 0) {
							availWd = column._maxWidth - column._width;
							if (availWd) {
								availWds.push({
									availWd: -1 * availWd,
									colIndx: i
								})
							}
						} else {
							availWd = column._width - column._minWidth;
							if (availWd) {
								availWds.push({
									availWd: availWd,
									colIndx: i
								})
							}
						}
					}
					if (resized) {
						columnResized = column;
						delete column._resized
					}
				}
				availWds.sort(function(obj1, obj2) {
					if (obj1.availWd > obj2.availWd) {
						return 1
					} else if (obj1.availWd < obj2.availWd) {
						return -1
					} else {
						return 0
					}
				});
				for (var i = 0, len = availWds.length; i < len; i++) {
					var obj = availWds[i],
						availWd = obj.availWd,
						colIndx = obj.colIndx,
						part = Math.round(diff / (len - i)),
						column = CM[colIndx],
						wd, colWd = column._width;
					if (Math.abs(availWd) > Math.abs(part)) {
						wd = colWd - part;
						diff = diff - part
					} else {
						wd = colWd - availWd;
						diff = diff - availWd
					}
					column.width = column._width = wd
				}
				if (diff != 0 && columnResized) {
					var wd = columnResized._width - diff;
					if (wd > columnResized._maxWidth) {
						wd = columnResized._maxWidth
					} else if (wd < columnResized._minWidth) {
						wd = columnResized._minWidth
					}
					columnResized.width = columnResized._width = wd
				}
			}
		},
		numericVal: function(width, totalWidth) {
			var val;
			if ((width + "").indexOf("%") > -1) {
				val = parseInt(width) * totalWidth / 100
			} else {
				val = parseInt(width)
			}
			return Math.round(val)
		},
		refreshColumnWidths: function(ui) {
			ui = ui || {};
			var that = this.that,
				o = that.options,
				numberCell = o.numberCell,
				flexWidth = o.width === "flex",
				cbWidth = 0,
				CM = that.colModel,
				autoFit = this.autoFit,
				contWd = this.dims.wdCenter,
				CMLength = CM.length,
				sbWidth = 0,
				minColWidth = o.minColWidth,
				maxColWidth = o.maxColWidth;
			var numberCellWidth = 0;
			if (numberCell.show) {
				if (numberCell.width < numberCell.minWidth) {
					numberCell.width = numberCell.minWidth
				}
				numberCellWidth = numberCell.outerWidth = numberCell.width
			}
			var availWidth = flexWidth ? null : contWd - sbWidth - numberCellWidth,
				minColWidth = Math.floor(this.numericVal(minColWidth, availWidth)),
				maxColWidth = Math.ceil(this.numericVal(maxColWidth, availWidth)),
				rem = 0;
			if (!flexWidth && availWidth < 5 || isNaN(availWidth)) {
				if (o.debug) {
					throw "availWidth N/A"
				}
				return
			}
			delete that.percentColumn;
			for (var i = 0; i < CMLength; i++) {
				var column = CM[i],
					hidden = column.hidden;
				if (hidden) {
					continue
				}
				var colWidth = column.width,
					colWidthPercent = (colWidth + "").indexOf("%") > -1 ? true : null,
					colMinWidth = column.minWidth,
					colMaxWidth = column.maxWidth,
					colMinWidth = colMinWidth ? this.numericVal(colMinWidth, availWidth) : minColWidth,
					colMaxWidth = colMaxWidth ? this.numericVal(colMaxWidth, availWidth) : maxColWidth;
				if (colMaxWidth < colMinWidth) {
					colMaxWidth = colMinWidth
				}
				if (colWidth != undefined) {
					var wdFrac, wd = 0;
					if (!flexWidth && colWidthPercent) {
						that.percentColumn = true;
						column.resizable = false;
						column._percent = true;
						wdFrac = this.numericVal(colWidth, availWidth) - cbWidth;
						wd = Math.floor(wdFrac);
						rem += wdFrac - wd;
						if (rem >= 1) {
							wd += 1;
							rem -= 1
						}
					} else if (colWidth) {
						wd = colWidth * 1
					}
					if (wd < colMinWidth) {
						wd = colMinWidth
					} else if (wd > colMaxWidth) {
						wd = colMaxWidth
					}
					column._width = wd
				} else {
					column._width = colMinWidth
				}
				if (!colWidthPercent) {
					column.width = column._width
				}
				column._minWidth = colMinWidth;
				column._maxWidth = flexWidth ? 1e3 : colMaxWidth
			}
			if (flexWidth === false && ui.refreshWidth !== false) {
				if (autoFit) {
					this.autoFitCols()
				}
			}
		},
		formatCell: function(cellData, format, localeFmt) {
			var fval, color;
			if (cellData == null) {
				fval = cellData
			} else if (pq.isFn(format)) {
				fval = format(cellData)
			} else {
				[fval, color] = pq.formatNumber(cellData, format, localeFmt, true)
			}
			return [fval, color]
		},
		renderCell: function(objP) {
			var self = this,
				that = self.that,
				styleStr = pq.styleStr,
				styleObj = pq.styleObj,
				url, attr = objP.attr || [],
				style = objP.style || [],
				style = styleObj(style[0]) || {},
				dattr, dstyle, dcls, dprop, Export = objP.Export,
				o = that.options,
				cls = objP.cls || [],
				rowData = objP.rowData,
				rip = objP.rowIndxPage,
				column = objP.column,
				dataIndx = column.dataIndx,
				dataType = (rowData.pq_celldt || {})[dataIndx] || column.dataType,
				isPic = dataType == "pic",
				colIndx = objP.colIndx,
				align, processAttr = that.processAttr,
				colStyle = column.style,
				cellstyle, fn = rowData.pq_fn || {},
				rowStyle = self.rowStyle,
				cellattr, cellcls, cellprop = (rowData.pq_cellprop || {})[dataIndx] || {},
				rowprop = rowData.pq_rowprop || {},
				freezeCols = o.freezeCols,
				render, cellData, columnBorders = o.columnBorders,
				outer;
			if (!rowData) {
				return
			}
			cellData = rowData[dataIndx];
			if (!Export) {
				colStyle && styleObj(colStyle, style);
				rowStyle[rip] && styleObj(rowStyle[rip], style);
				cellstyle = (rowData.pq_cellstyle || {})[dataIndx];
				cellstyle && styleObj(cellstyle, style);
				if (colIndx == freezeCols - 1 && columnBorders) {
					cls.push("pq-last-frozen-col")
				}
				column.cls && cls.push(column.cls);
				if (o.editModel.addDisableCls && that.isEditable(objP) === false) {
					cls.push("pq-cell-disable")
				}
				if (isPic) {
					cellData = cellData && (cellData.substr(0, 4) == "data" || cellData.substr(0, 4) == "http") ? '<img style="max-height:100%;max-width:100%;" src = "' + cellData + '" />' : cellData
				} else if (pq.isStr(cellData) && dataType != "html") cellData = pq.escapeHtml(cellData)
			}
			var dataCell, dt = pq.getDataTypeFromVal(cellData),
				_cf = o.format.call(that, rowData, column, cellprop, rowprop) || o["fmt" + dt],
				[formatVal, color] = _cf ? this.formatCell(cellData, _cf, o.localeFmt) : [cellData, ""];
			if (dt) {
				style["text-align"] = "right"
			}
			if (color) {
				style.color = color
			}
			fn = (fn[dataIndx] || {}).fn;
			objP.dataIndx = dataIndx;
			objP.cellData = cellData;
			objP.formatVal = formatVal;
			if (render = column.render) {
				dataCell = that.callFn(render, objP);
				if (dataCell && typeof dataCell != "string") {
					(dattr = dataCell.attr) && attr.push(processAttr(dattr));
					dprop = dataCell.prop;
					(dcls = dataCell.cls) && cls.push(dcls);
					(dstyle = dataCell.style) && styleObj(dstyle, style);
					dataCell = dataCell.text
				}
			} else if (cellprop.link) {
				url = cellprop.link;
				dataCell = "<a href='" + url + "' target='_blank'>" + (cellData || url) + "</a>"
			} else if (fn && fn.indexOf("HYPERLINK") == 0) {
				url = fn.substring(11, fn.indexOf('"', 11));
				dataCell = "<a href='" + url + "' target='_blank'>" + (cellData || url) + "</a>"
			}
			if (dataCell == null && (render = column._renderG || column._render)) {
				dataCell = render.call(that, objP)
			}
			if (dataCell && typeof dataCell != "string") {
				(dattr = dataCell.attr) && attr.push(dattr);
				(dcls = dataCell.cls) && cls.push(dcls);
				(dstyle = dataCell.style) && styleObj(dstyle, style);
				outer = dataCell.outer;
				dataCell = dataCell.text
			}
			if (dataCell == null) {
				dataCell = formatVal == null ? cellData : formatVal
			}
			if (Export) {
				return [dataCell, dstyle, dprop, (dattr || {}).title]
			} else {
				dprop = dprop || {};
				align = cellprop.align;
				if (align = dprop.align || (align != null ? align : rowprop.align || column.align)) cls.push("pq-align-" + align);
				align = cellprop.valign;
				if (align = dprop.valign || (align != null ? align : rowprop.valign || column.valign)) cls.push("pq-valign-" + align);
				cellcls = (rowData.pq_cellcls || {})[dataIndx];
				if (cellcls) {
					cls.push(cellcls)
				}
				cellattr = (rowData.pq_cellattr || {})[dataIndx];
				if (cellattr) {
					attr.push(processAttr(cellattr, style))
				}
				style = styleStr(style);
				style = style ? " style='" + style + "' " : "";
				dataCell = pq.newLine(dataCell);
				if (dataCell == null) dataCell = "";
				else if (pq.isLink(dataCell)) cls.push("pq-has-link");
				var str = ["<div class='", cls.join(" "), "' ", attr.join(" "), style, " >", isPic ? dataCell : "<div>" + dataCell + "</div>", outer || "", "</div>"].join("");
				return str
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fn = _pq._pqGrid.prototype;
	fn.getHeadCell = function($td) {
		var arr = this.iRenderHead.getCellIndx($td[0]),
			ri = arr[0],
			ci = arr[1],
			isParent, column, cCM;
		if (ci != null && ri != null) {
			column = (this.headerCells[ri] || [])[ci];
			if (column) {
				cCM = column.colModel
			}
		}
		if (cCM && cCM.length) {
			isParent = true
		}
		return {
			col: column || this.colModel[ci],
			ci: ci,
			ri: ri,
			isParent: isParent
		}
	};
	fn.flex = function(ui) {
		var colIndxs = this.colIndxs;
		if (ui && ui.dataIndx) {
			ui.colIndx = ui.dataIndx.map(function(di) {
				return colIndxs[di]
			})
		}
		this.iResizeColumns.flex(ui)
	};
	fn.flexAsync = function() {
		var id;
		return function(ui) {
			var self = this;
			cancelAnimationFrame(id);
			id = requestAnimationFrame(function() {
				self.flex(ui)
			})
		}
	}();
	_pq.mixHeader = {
		colCollapse: function(column, evt) {
			var that = this.that,
				ui = {
					column: column
				},
				collapsible = column.collapsible;
			if (that._trigger("beforeColumnCollapse", evt, ui) !== false) {
				collapsible.on = !collapsible.on;
				if (that._trigger("columnCollapse", evt, ui) !== false) {
					that.refresh({
						colModel: true
					})
				}
			}
		},
		onHeaderClick: function(evt) {
			var self = this,
				that = self.that,
				$td, column, obj, $target, iDG = that.iDragColumns;
			that._trigger("headerClick", evt);
			if (iDG && iDG.status != "stop") {
				return
			}
			$target = $(evt.target);
			if ($target.is("input,label")) {
				return true
			}
			$td = $target.closest(".pq-grid-col,.pq-grid-number-cell");
			if ($td.length) {
				obj = that.getHeadCell($td);
				column = obj.col;
				if ($target.hasClass("pq-col-collapse")) {
					self.colCollapse(column, evt)
				} else if (!obj.isParent) {
					return self.onHeaderCellClick(column, obj.ci, evt)
				}
			}
		},
		getTitle: function(column, ci) {
			var title = column.title,
				t = pq.isFn(title) ? title.call(this.that, {
					column: column,
					colIndx: ci,
					dataIndx: column.dataIndx
				}) : title;
			return t
		},
		createHeaderCell: function(objP) {
			var self = this,
				that = self.that,
				o = that.options,
				cls = objP.cls,
				style = objP.style,
				attr = objP.attr,
				column = objP.column,
				colIndx = objP.colIndx,
				SSS = self.getSortSpaceSpans(o.sortModel),
				collapsedStr, collapsible = column.collapsible,
				styleStr = pq.styleStr,
				align = column.halign || column.align,
				hvalign = column.hvalign,
				ccls = column.cls,
				type = column.type,
				tmp, cm = column.colModel,
				hasMenuH = self.hasMenuH(o, column),
				title = self.getTitle(column, colIndx),
				title = title != null ? title : column.dataIndx;
			if (align) cls.push("pq-align-" + align);
			if (hvalign) cls.push("pq-valign-" + hvalign);
			if (tmp = column.styleHead) style.push(styleStr(tmp));
			if (tmp = column.attrHead) attr.push(that.processAttr(tmp));
			if (ccls) cls.push(ccls);
			cls.push(column.clsHead);
			if (hasMenuH) cls.push("pq-has-menu");
			if (!cm || !cm.length) {
				if (!column.empty) cls.push("pq-grid-col-leaf")
			} else {
				if (collapsible) {
					cls.push("pq-collapsible-th");
					collapsedStr = ["<span class='pq-col-collapse pq-icon-hover ui-icon ui-icon-", collapsible.on ? "plus" : "minus", "'></span>"].join("")
				}
			}
			attr.push("pq-row-indx=" + objP.rowIndx + " pq-col-indx=" + objP.colIndx);
			column.pq_title = title;
			return ["<div ", attr.join(" "), " ", " class='", cls.join(" "), "' style='", style.join(""), "' >", "<div class='pq-td-div'>", collapsedStr, "<span class='pq-title-span'>", title, "</span>", SSS, "</div>", hasMenuH ? "<span class='pq-icon-menu'></span>" : "", "</div>"].join("")
		},
		getSortSpaceSpans: function(SM) {
			if (SM.on) {
				var pq_space = SM.space ? " pq-space" : "";
				return ["<span class='pq-icon-col-sort", pq_space, "'></span>", SM.number ? "<span class='pq-col-sort-count" + pq_space + "'></span>" : ""].join("")
			} else {
				return ""
			}
		},
		hasMenuH: function(o, column) {
			var CM = column.colModel;
			if (column.empty || CM && CM.length) {
				return false
			}
			var omenuH = o.menuIcon,
				colmenuH = column.menuIcon;
			return omenuH && colmenuH !== false || omenuH !== false && colmenuH
		},
		onHeaderCellClick: function(column, colIndx, evt) {
			column = column || {};
			var that = this.that,
				o = that.options,
				SM = o.sortModel,
				SEM = o.selectionModel,
				$target = $(evt.target),
				dataIndx = column.dataIndx;
			if (that._trigger("headerCellClick", evt, {
					column: column,
					colIndx: colIndx,
					dataIndx: dataIndx
				}) === false || colIndx == -1) {
				return
			}
			if (!$target.closest(".pq-grid-header-search-row")[0]) {
				if (SEM.column && SEM.type && !$target.hasClass("pq-title-span") && !$target.hasClass("ui-icon")) {
					var firstVisibleRIP = that.getFirstVisibleRIP(),
						address = {
							c1: colIndx,
							firstC: colIndx,
							firstR: firstVisibleRIP
						},
						iSel = that.iSelection,
						oldaddress = iSel.address(),
						alen = oldaddress.length;
					if (pq.isCtrl(evt)) {
						iSel.add(address)
					} else {
						if (evt.shiftKey) {
							if (alen && oldaddress[alen - 1].type == "column") {
								var last = oldaddress[alen - 1];
								last.c1 = last.firstC;
								last.c2 = colIndx;
								last.r1 = last.r2 = last.type = last.cc = undefined
							}
							address = oldaddress
						}
						that.Range(address, false).select()
					}
					firstVisibleRIP = that.getFirstVisibleRIP(true);
					if (firstVisibleRIP != null) {
						that.focus({
							rowIndxPage: firstVisibleRIP,
							colIndx: colIndx
						});
						that._trigger("mousePQUp")
					}
				} else if (SM.wholeCell || $target.hasClass("pq-title-span")) {
					if (that.isSortable(column)) {
						that.sort({
							sorter: [{
								dataIndx: dataIndx,
								sortIndx: column.sortIndx
							}],
							addon: true,
							skipCustomSort: pq.isCtrl(evt),
							tempMultiple: SM.multiKey && evt[SM.multiKey],
							evt: evt
						})
					}
				}
			}
		},
		setSortIcons: function() {
			var that = this.that,
				o = that.options,
				jui = o.ui,
				ri = that.headerCells.length - 1,
				$header = that.$head_i;
			if (!$header) {
				return
			}
			var sorters = that.iSort.getSorter(),
				sorterLen = sorters.length,
				number = false,
				SM = that.options.sortModel;
			if (SM.number && sorterLen > 1) {
				number = true
			}
			for (var i = 0; i < sorterLen; i++) {
				var sorter = sorters[i],
					dataIndx = sorter.dataIndx,
					ci = that.getColIndx({
						dataIndx: dataIndx
					}),
					dir = sorter.dir;
				if (ci >= 0) {
					var addClass = jui.header_active + " pq-col-sort-" + (dir == "up" ? "asc" : "desc"),
						cls2 = "ui-icon ui-icon-triangle-1-" + (dir == "up" ? "n" : "s"),
						$th = $(that.iRenderHead.getCell(ri, ci));
					$th.addClass(addClass);
					$th.find(".pq-icon-col-sort").addClass(cls2);
					if (number) {
						$th.find(".pq-col-sort-count").html(i + 1)
					}
				}
			}
		}
	};
	_pq.cResizeColumns = function(that) {
		var self = this;
		self.that = that;
		that.$head_i.on({
			mousedown: function(evt) {
				if (!evt.pq_composed) {
					var $target = $(evt.target);
					self.setDraggables(evt);
					evt.pq_composed = true;
					var e = $.Event("mousedown", evt);
					$target.trigger(e)
				}
			},
			dblclick: function(evt) {
				self.doubleClick(evt)
			}
		}, ".pq-grid-col-resize-handle");
		var o = that.options,
			flex = o.flex;
		self.rtl = o.rtl ? "right" : "left";
		if (flex.on && flex.one) {
			that.one("ready", function() {
				self.flex()
			})
		}
	};
	_pq.cResizeColumns.prototype = {
		doubleClick: function(evt) {
			var that = this.that,
				o = that.options,
				flex = o.flex,
				$target = $(evt.target),
				colIndx = parseInt($target.attr("pq-col-indx"));
			if (isNaN(colIndx)) {
				return
			}
			if (flex.on) {
				this.flex(flex.all && !o.scrollModel.autoFit ? {} : {
					colIndx: [colIndx]
				})
			}
		},
		flex: function(ui) {
			this.that.iRenderB.flex(ui)
		},
		setDraggables: function(evt) {
			var $div = $(evt.target),
				that = this.that,
				self = this,
				rtl = self.rtl,
				scaleX, drag_left, drag_new_left, cl_left;
			$div.draggable({
				axis: "x",
				helper: function(evt, ui) {
					var $target = $(evt.target),
						indx = parseInt($target.attr("pq-col-indx"));
					self._setDragLimits(indx);
					self._getDragHelper(evt, ui);
					return $target
				},
				start: function(evt, ui) {
					drag_left = evt.clientX;
					cl_left = parseInt(self.$cl[0].style[rtl]);
					scaleX = that.getScale()[0]
				},
				drag: function(evt, ui) {
					drag_new_left = evt.clientX;
					var dx = (drag_new_left - drag_left) / scaleX;
					self.rtl == "right" && (dx *= -1);
					self.$cl[0].style[rtl] = cl_left + dx + "px"
				},
				stop: function(evt, ui) {
					return self.resizeStop(evt, ui, drag_left)
				}
			})
		},
		_getDragHelper: function(evt) {
			var that = this.that,
				o = that.options,
				freezeCols = o.freezeCols * 1,
				$target = $(evt.target),
				$grid_center = that.$grid_center,
				iR = that.iRenderHead,
				ci = $target.attr("pq-col-indx") * 1,
				scrollX = ci < freezeCols ? 0 : iR.scrollX(),
				ht = $grid_center.outerHeight(),
				left = iR.getLeft(ci) - scrollX,
				left2 = iR.getLeft(ci + 1) - scrollX,
				style = "style='height:" + ht + "px;" + this.rtl + ":";
			this.$clleft = $("<div class='pq-grid-drag-bar' " + style + left + "px;'></div>").appendTo($grid_center);
			this.$cl = $("<div class='pq-grid-drag-bar' " + style + left2 + "px;'></div>").appendTo($grid_center)
		},
		_setDragLimits: function(ci) {
			if (ci < 0) {
				return
			}
			var that = this.that,
				iR = that.iRenderHead,
				CM = that.colModel,
				column = CM[ci],
				cont_left = iR.getLeft(ci) + column._minWidth,
				cont_right = cont_left + column._maxWidth - column._minWidth,
				$drag = $(iR._resizeDiv(ci));
			if ($drag.draggable("instance")) {
				$drag.draggable("option", "containment", [cont_left, 0, cont_right, 0])
			}
		},
		columnResize: function(colIndx, dx, evt) {
			var self = this,
				that = self.that,
				CM = that.colModel,
				o = that.options,
				numberCell = o.numberCell,
				column;
			o.rtl && (dx *= -1);
			if (colIndx == -1) {
				column = null;
				var oldWidth = parseInt(numberCell.width),
					newWidth = oldWidth + dx;
				numberCell.width = newWidth
			} else {
				column = CM[colIndx];
				var oldWidth = parseInt(column.width),
					newWidth = oldWidth + dx;
				column.width = newWidth;
				column._resized = true
			}
			that.refresh({
				soft: true
			});
			that._trigger("columnResize", evt, {
				colIndx: colIndx,
				column: column,
				dataIndx: column ? column.dataIndx : null,
				oldWidth: oldWidth,
				newWidth: column ? column.width : numberCell.width
			})
		},
		resizeStop: function(evt, ui, drag_left) {
			var self = this;
			self.$clleft.remove();
			self.$cl.remove();
			var drag_new_left = evt.clientX,
				dx = drag_new_left - drag_left,
				$target = $(ui.helper),
				colIndx = $target.attr("pq-col-indx") * 1;
			self.columnResize(colIndx, dx, evt)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.cDragColumns = function(that) {
		var self = this,
			o = that.options,
			dragColumns = o.dragColumns || {},
			scaleB, arrow = function(updown, icon) {
				return $("<div class='pq-arrow-" + updown + " ui-icon " + icon + "'></div>").appendTo(that.$grid_center)
			};
		self.that = that;
		self.rtl = o.rtl;
		self.status = "stop";
		self.$arrowTop = arrow("down", dragColumns.topIcon);
		self.$arrowBottom = arrow("up", dragColumns.bottomIcon);
		self.hideArrows();
		if (dragColumns.enabled) {
			that.$head_i.draggable({
				distance: 5,
				cursorAt: {
					top: -10,
					left: -10
				},
				cancel: ".pq-grid-header-search-row,input,textarea,button,select,option,.pq-grid-number-cell",
				zIndex: "1000",
				appendTo: "body",
				revert: self.revert.bind(self),
				helper: function(evt, ui) {
					var th = evt.target.closest(".pq-grid-col");
					if (th) {
						var colIndices = self.colIndicesDrag = that.getHeadIndices(th),
							col = self.columnDrag = colIndices.column,
							parent = col.parent,
							rejectIcon = that.options.dragColumns.rejectIcon,
							$helper, scale = that.getScale();
						scaleB = pq.getScale(document.body);
						if (!col || col.nodrag || col._nodrag || parent && parent.colSpan == 1 || col.empty || that._trigger("columnDrag", evt, {
								column: col
							}) === false) {
							return "<span/>"
						}
						that.$head_i.find(".pq-grid-col-resize-handle").hide();
						$helper = self.$helper = $("<div class='pq-col-drag-helper pq-theme pq-grid-cell' data-di=" + col.dataIndx + " ><div>" + "<span class='pq-drag-icon ui-icon " + rejectIcon + "'></span>" + col.pq_title + "</div></div>");
						$helper.css({
							scale: scale[0] / scaleB[0] + " " + scale[1] / scaleB[1]
						});
						return $helper[0]
					} else {
						return $("<div></div>")
					}
				},
				start: function() {},
				drag: function(evt, ui) {
					if (self.$helper) {
						self.status = "drag";
						var pos = ui.position,
							origEvt = evt.originalEvent,
							target = origEvt && origEvt.target != document ? origEvt.target : evt.target,
							td = target.closest(".pq-grid-col"),
							$group, colIndicesDrag = self.colIndicesDrag,
							ri_o = colIndicesDrag.ri,
							col_o = colIndicesDrag.column,
							ci_o1 = col_o.leftPos,
							ci_o2 = ci_o1 + col_o.o_colspan;
						pos.left = pos.left / scaleB[0];
						pos.top = pos.top / scaleB[1];
						if (td && !td.closest(".pq-grid-header-search-row") && that.evtBelongs(origEvt)) {
							var colIndicesDrop = that.getHeadIndices(td),
								col = colIndicesDrop.column,
								ri = colIndicesDrop.ri,
								ci = colIndicesDrop.colIndx;
							if (col.empty || col == col_o || col.nodrop || col._nodrop || ri_o < ri && ci >= ci_o1 && ci < ci_o2) {} else {
								self.colIndicesDrop = colIndicesDrop;
								self.onDrag(evt, td);
								return
							}
						} else {
							self.hideArrows();
							$group = $(".ui-droppable-hover", that.$top);
							self.updateDragHelper(!!$group[0])
						}
						self.colIndicesDrop = null
					}
				},
				stop: function(evt) {
					self.status = "stop";
					if (self.$helper) {
						self.hideArrows();
						var colIndicesDrop = self.colIndicesDrop;
						that.$head_i.find(".pq-grid-col-resize-handle").show();
						if (colIndicesDrop) self.onDrop(self.colIndicesDrag, colIndicesDrop, evt)
					}
				}
			})
		}
	};
	_pq.cDragColumns.prototype = {
		revert: function() {
			(this.$helper || $()).hide("explode", function() {
				$(this).remove()
			})
		},
		getRowIndx: function(hc, colIndx, lastRowIndx) {
			var column, column2;
			while (lastRowIndx) {
				column = hc[lastRowIndx][colIndx];
				column2 = hc[lastRowIndx - 1][colIndx];
				if (column != column2) {
					break
				}
				lastRowIndx--
			}
			return lastRowIndx
		},
		hideArrows: function() {
			this.$arrowTop.hide();
			this.$arrowBottom.hide()
		},
		moveColumn: function(colIndxDrag, colIndxDrop, leftDrop, rowIndxDrag, rowIndxDrop) {
			var self = this,
				that = self.that,
				colModel = "colModel",
				optCM = that.options[colModel],
				hc = that.headerCells,
				lastRowIndx = that.depth - 1,
				rowIndxDrag = rowIndxDrag == null ? self.getRowIndx(hc, colIndxDrag, lastRowIndx) : rowIndxDrag,
				rowIndxDrop = rowIndxDrop == null ? self.getRowIndx(hc, colIndxDrop, lastRowIndx) : rowIndxDrop,
				columnDrag = hc[rowIndxDrag][colIndxDrag],
				columnDrop = hc[rowIndxDrop][colIndxDrop],
				columnDragParent = columnDrag.parent,
				columnDropParent = columnDrop.parent,
				colModelDrag = columnDragParent ? columnDragParent[colModel] : optCM,
				colModelDrop = columnDropParent ? columnDropParent[colModel] : optCM,
				indxDrag = colModelDrag.indexOf(columnDrag),
				incr = leftDrop ? 0 : 1,
				indxDrop = colModelDrop.indexOf(columnDrop),
				column = that.iCols.move(1, indxDrag, indxDrop + incr, columnDragParent, columnDropParent, "dnd")[0];
			return column
		},
		onDrop: function(colIndicesDrag, colIndicesDrop, evt) {
			var self = this,
				that = self.that,
				colIndxDrag = colIndicesDrag.colIndx,
				rowIndxDrag = colIndicesDrag.ri,
				colIndxDrop = colIndicesDrop.colIndx,
				rowIndxDrop = colIndicesDrop.ri,
				left = self.leftDrop,
				column;
			if (self.rtl) left = !left;
			if (that._trigger("beforeColumnOrder", null, {
					colIndxDrag: colIndxDrag,
					colIndxDrop: colIndxDrop,
					left: left
				}) !== false) {
				column = self.moveColumn(colIndxDrag, colIndxDrop, left, rowIndxDrag, rowIndxDrop);
				if (column) {
					that._trigger("columnOrder", null, {
						dataIndx: column.dataIndx,
						column: column,
						oldcolIndx: colIndxDrag,
						colIndx: that.getColIndx({
							column: column
						})
					})
				}
			}
		},
		onDrag: function(evt, td) {
			var self = this,
				wd = td.offsetWidth,
				lft, leftDrop, target = evt.originalEvent.target;
			self.updateDragHelper(true);
			lft = evt.offsetX + pq.offset(target, td).left;
			leftDrop = lft < wd / 2;
			self.leftDrop = leftDrop;
			self.showFeedback(td, leftDrop)
		},
		showFeedback: function(td, leftDrop) {
			var that = this.that,
				left = pq.offset(td, that.element[0]).left + (leftDrop ? 0 : td.offsetWidth) - 8,
				top = td.offsetTop - 16,
				top2 = that.$header[0].offsetHeight;
			this.$arrowTop.css({
				left: left,
				top: top,
				display: ""
			});
			this.$arrowBottom.css({
				left: left,
				top: top2,
				display: ""
			})
		},
		updateDragHelper: function(accept) {
			var that = this.that,
				dragColumns = that.options.dragColumns,
				removeClass = "removeClass",
				addClass = "addClass",
				acceptIcon = dragColumns.acceptIcon,
				rejectIcon = dragColumns.rejectIcon,
				$drag_helper = this.$helper;
			if ($drag_helper) {
				$drag_helper[accept ? removeClass : addClass]("ui-state-error").find(".pq-drag-icon")[accept ? addClass : removeClass](acceptIcon)[accept ? removeClass : addClass](rejectIcon)
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.mixHeaderFilter = {
		_input: function(column, value, cls, style, attr, cond) {
			var that = this.that,
				o = that.options,
				showClearIcon = !o.filterModel.hideClearIcon;
			value = that.format(value, "Filter", column);
			if (showClearIcon) {
				attr += ` is="clear-text" ctitle='${o.strClear}'`
			}
			return `<input type="text" value="${value}" name=${column.dataIndx} style="${style}" class="${cls}" ${attr} />`
		},
		_onKeyDown: function(evt, ui, $this) {
			var self = this,
				that = this.that,
				$ele, keyCode = evt.keyCode,
				keyCodes = $.ui.keyCode;
			if (keyCode === keyCodes.TAB) {
				var colIndx = self.getCellIndx($this.closest(".pq-grid-col")[0])[1],
					CM = that.colModel,
					$inp, found, shiftKey = evt.shiftKey,
					column = CM[colIndx];
				if ((column.filterUI || {}).type == "textbox2") {
					that.scrollColumn({
						colIndx: colIndx
					});
					$ele = self.getCellEd(colIndx)[1];
					if ($ele[0] == $this[0]) {
						if (!shiftKey) $inp = $ele[1]
					} else {
						if (shiftKey) $inp = $ele[0]
					}
					if ($inp) {
						$inp.focus();
						evt.preventDefault();
						return false
					}
				}
				do {
					if (shiftKey) colIndx--;
					else colIndx++;
					if (colIndx < 0 || colIndx >= CM.length) {
						break
					}
					var column = CM[colIndx],
						cfilter = column.filter;
					if (!column.hidden && cfilter) {
						found = true;
						that.scrollColumn({
							colIndx: colIndx
						}, function() {
							var $inp = self.getCellEd(colIndx)[1];
							if ((column.filterUI || {}).type == "textbox2") {
								$inp = $(shiftKey ? $inp[1] : $inp[0])
							}
							if ($inp) {
								$inp.focus()
							}
						});
						break
					}
				} while (1 === 1);
				if (!found) {
					that[shiftKey ? "focusHead" : "focus"]()
				}
				evt.preventDefault();
				return false
			}
		},
		_textarea: function(dataIndx, value, cls, style, attr) {
			return ["<textarea name='", dataIndx, "' style='" + style + "' class='" + cls + "' " + attr + " >", value, "</textarea>"].join("")
		},
		bindListener: function($ele, listener, column) {
			var self = this,
				that = self.that,
				options = that.options,
				filter = column.filter,
				arr = pq.filter.getVal(filter),
				oval = arr[0],
				oval2 = arr[1];
			for (var event in listener) {
				var handler = listener[event];
				pq.fakeEvent($ele, event, options.filterModel.timeout);
				$ele.off(event).on(event, function(evt) {
					var value, value2, filterUI = column.filterUI,
						type = filterUI.type,
						condition = filterUI.condition;
					if (type == "checkbox") {
						value = $ele.pqval({
							incr: true
						})
					} else if (type == "textbox2") {
						value = $($ele[0]).val();
						value2 = $($ele[1]).val()
					} else {
						value = $ele.val()
					}
					var fn = x => x === "" ? undefined : that.deformatCondition(x, column, condition);
					value = fn(value);
					value2 = fn(value2);
					if (oval !== value || oval2 !== value2) {
						oval = value;
						oval2 = value2;
						handler = pq.getFn(handler);
						return handler.call(that, evt, {
							column: column,
							dataIndx: column.dataIndx,
							value: value,
							value2: value2
						})
					}
				})
			}
		},
		betweenTmpl: function(input1, input2) {
			var strS = ["<div class='pq-from-div'>", input1, "</div>", "<span class='pq-from-to-center'>-</span>", "<div class='pq-to-div'>", input2, "</div>"].join("");
			return strS
		},
		createListener: function(type) {
			var obj = {},
				that = this.that;
			type.split(" ").forEach(type => {
				obj[type] = function(evt, ui) {
					var col = ui.column;
					that.filter({
						rules: [{
							dataIndx: col.filterIndx || ui.dataIndx,
							condition: col.filter.condition,
							value: ui.value,
							value2: ui.value2
						}]
					})
				}
			});
			return obj
		},
		getCellEd: function(ci) {
			var self = this,
				ri = self.data.length - 1,
				$cell = $(this.getCell(ri, ci)),
				$editor = $cell.find(".pq-grid-hd-search-field");
			return [$cell, $editor]
		},
		onCreateHeader: function() {
			var self = this;
			if (self.that.options.filterModel.header) {
				self.eachH(function(column) {
					if (column.filter) {
						self.postRenderCell(column)
					}
				})
			}
		},
		onHeaderKeyDown: function(evt, ui) {
			var $src = $(evt.originalEvent.target);
			if ($src.hasClass("pq-grid-hd-search-field")) {
				return this._onKeyDown(evt, ui, $src)
			} else {
				return true
			}
		},
		postRenderCell: function(column) {
			var dataIndx = column.dataIndx,
				filterUI = column.filterUI || {},
				filter = column.filter,
				self = this,
				that = self.that,
				ci = that.colIndxs[dataIndx],
				arr = this.getCellEd(ci),
				$cell = arr[0],
				$editor = arr[1];
			if ($editor.length == 0) {
				return
			}
			var ftype = filterUI.type,
				timeout = "timeout change",
				events = {
					button: "click",
					select: "change",
					checkbox: "change",
					textbox: timeout,
					textbox2: timeout
				},
				value = pq.filter.getVal(filter)[0];
			if (ftype == "checkbox") {
				$editor.pqval({
					val: value
				})
			} else if (ftype == "select") {
				value = value || [];
				if (!$.isArray(value)) {
					value = [value]
				}
				if (filter.title) {
					value = filter.title.call(that, value, column)
				} else {
					value = value.slice(0, 25).map(function(val) {
						return that.format(val, "Filter", column)
					});
					value = value.join(", ")
				}
				$editor.val(value)
			}
			$editor.on("keydown", function(evt) {
				if (evt.keyCode == $.ui.keyCode.ESCAPE) {
					that.focusHead({
						colIndx: ci
					});
					evt.preventDefault()
				}
			});
			var finit = filterUI.init,
				flistener = filter.listener,
				listeners = filter.listeners || [flistener ? flistener : events[ftype]];
			if (finit) {
				finit.find(function(i) {
					return that.callFn(i, {
						dataIndx: dataIndx,
						column: column,
						indx: 0,
						filter: filter,
						filterUI: filterUI,
						$cell: $cell,
						$editor: $editor.filter(":visible")
					})
				})
			}
			for (var listener of listeners) {
				var typeL = typeof listener,
					obj = {};
				if (typeL == "string") {
					listener = self.createListener(listener)
				} else if (typeL == "function") {
					obj[events[ftype]] = listener;
					listener = obj
				}
				self.bindListener($editor, listener, column)
			}
		},
		getControlStr: function(column) {
			var that = this.that,
				dataIndx = column.dataIndx,
				filter = column.filter,
				corner_cls = " ui-corner-all",
				varr = pq.filter.getVal(filter),
				value = varr[0],
				value2 = varr[1],
				condition = varr[2],
				ui = {
					column: column,
					dataIndx: dataIndx,
					condition: condition,
					indx: 0
				},
				filterUI = column.filterUI = pq.filter.getFilterUI(ui, that),
				type = filterUI.type,
				strS = "";
			if (type == "textbox2") {
				value2 = value2 != null ? value2 : ""
			}
			var cls = "pq-grid-hd-search-field " + (filterUI.cls || ""),
				style = filterUI.style || "",
				attr = (filterUI.attr || "") + " tabindex=-1";
			if (type && type.indexOf("textbox") >= 0) {
				value = value != null ? value : "";
				cls = cls + " pq-search-txt" + corner_cls;
				if (type == "textbox2") {
					strS = this.betweenTmpl(this._input(column, value, cls + " pq-from", style, attr, condition), this._input(column, value2, cls + " pq-to", style, attr, condition))
				} else {
					strS = this._input(column, value, cls, style, attr, condition)
				}
			} else if (type === "select") {
				cls = cls + corner_cls;
				var attrSelect = ["name='", dataIndx, "' class='", cls, "' style='", style, "' ", attr].join("");
				strS = "<input type='text' " + attrSelect + " >" + "<span class='ui-icon pq-dd-icon ui-icon-caret-1-s'></span>"
			} else if (type == "checkbox") {
				var checked = value == null || value == false ? "" : "checked=checked";
				strS = ["<input ", checked, " name='", dataIndx, "' type=checkbox class='" + cls + "' style='" + style + "' " + attr + " />"].join("")
			} else if (pq.isStr(type)) {
				strS = type
			}
			return strS
		},
		renderFilterCell: function(column, ci, td_cls) {
			var self = this,
				td, that = self.that,
				o = that.options,
				FM = o.filterModel,
				hasMenu, ccls = column.cls,
				strS, align = column.halign || column.align;
			align && td_cls.push("pq-align-" + align);
			ccls && td_cls.push(ccls);
			td_cls.push(column.clsFilter);
			if (column.filter) {
				strS = self.getControlStr(column);
				if (strS) {
					td_cls.push("pq-col-" + ci)
				}
			} else if (!o.showHeader && column.type == "detail") {
				strS = self.getTitle(column, ci)
			}
			hasMenu = self.hasMenu(FM, column);
			if (hasMenu) td_cls.push("pq-has-menu");
			td = ["<div class='pq-td-div' style='overflow:hidden;'>", "", strS, "</div>", hasMenu ? "<span class='pq-icon-filter'></span>" : ""].join("");
			return td
		},
		hasMenu: function(FM, col) {
			var FM_menu = FM.menuIcon,
				filter_menu = (col.filter || {}).menuIcon;
			return FM_menu && filter_menu !== false || FM_menu !== false && filter_menu
		}
	}
})(jQuery);
(function($) {
	var cRefresh = $.paramquery.cRefresh = function(that) {
		var self = this,
			eventNamespace = that.eventNamespace;
		self.vrows = [];
		self.that = that;
		that.on("dataReadyDone", function() {
			self.addRowIndx(true)
		});
		$(window).on("resize" + eventNamespace + " " + "orientationchange" + eventNamespace, self.onWindowResize.bind(self))
	};
	$.extend(cRefresh, {
		Z: function() {
			return (window.outerWidth - 8) / window.innerWidth
		},
		cssZ: function() {
			return document.body.style.zoom
		},
		isFullScreen: function() {
			return document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen || window.innerHeight == screen.height
		},
		isSB: function() {
			return $(document).height() > $(window).height()
		}
	});
	$(document).one("pq:ready", function() {
		var z = cRefresh.Z,
			cssZ = cRefresh.cssZ,
			z1 = z(),
			cssZ1 = cssZ();
		cRefresh.isZoom = function() {
			var z2 = z(),
				cssZ2 = cssZ();
			if (z1 != z2 || cssZ1 != cssZ2) {
				z1 = z2;
				cssZ1 = cssZ2;
				return true
			}
		};
		var isSB = cRefresh.isSB,
			sb = isSB();
		pq.onResize(document.body, function() {
			var nsb = isSB();
			if (nsb != sb) {
				sb = nsb;
				$(window).trigger("resize", {
					SB: true
				})
			}
		})
	});
	$(window).on("resize", function() {
		if (cRefresh.isZoom) cRefresh.ISZOOM = cRefresh.isZoom()
	});
	cRefresh.prototype = {
		addRT: function(_data) {
			var that = this.that,
				o = that.options,
				DM = o.dataModel,
				RT = o.rowTemplate;
			if (RT) {
				var data = _data || DM.data,
					i = data.length,
					rd;
				while (i--) {
					rd = data[i];
					if (rd) {
						pq.extendT(rd, RT)
					}
				}
			}
		},
		addRowIndx: function(UF) {
			var that = this.that,
				o = that.options,
				DM = o.dataModel,
				dataUF = DM.dataUF,
				data = that.get_p_data(),
				i = data.length,
				rd;
			while (i--) {
				rd = data[i];
				rd && (rd.pq_ri = i)
			}
			if (UF && dataUF) {
				i = dataUF.length;
				while (i--) {
					delete dataUF[i].pq_ri
				}
			}
		},
		move: function() {},
		setGridAndCenterHeightForFlex: function() {
			var that = this.that,
				element = that.element;
			element.height("");
			that.$grid_center.height("");
			that.dims.htGrid = element[0].offsetHeight - 2
		},
		setGridWidthForFlex: function() {
			var that = this.that,
				o = that.options,
				maxWidthPixel = this.maxWidthPixel,
				$grid = that.element,
				toolWd = that.$toolPanel[0].offsetWidth,
				contWd = that.iRenderB.getFlexWidth(),
				gridWd = toolWd + contWd;
			if (o.maxWidth && gridWd >= this.maxWidthPixel) {
				gridWd = maxWidthPixel
			}
			that._trigger("contWd");
			$grid.width(gridWd + "px");
			that.dims.wdGrid = gridWd
		},
		_calcOffset: function(val) {
			var re = /(-|\+)([0-9]+)/;
			var match = re.exec(val);
			if (match && match.length === 3) {
				return parseInt(match[1] + match[2])
			} else {
				return 0
			}
		},
		setMax: function(prop) {
			var that = this.that,
				$grid = that.element,
				o = that.options,
				val = o[prop];
			if (val) {
				if (val == parseInt(val)) {
					val += "px"
				}
				$grid.css(prop, val)
			} else {
				$grid.css(prop, "")
			}
		},
		refreshGridWidthAndHeight: function() {
			var self = this,
				that = self.that,
				o = that.options,
				wd, ht, dims = that.dims,
				widthPercent = (o.width + "").indexOf("%") > -1 ? true : false,
				heightPercent = (o.height + "").indexOf("%") > -1 ? true : false,
				maxHeightPercent = (o.maxHeight + "").indexOf("%") > -1 ? true : false,
				flexHeight = o.height == "flex",
				dimsRelativeTo = o.dimsRelativeTo,
				maxHeightPercentAndFlexHeight = maxHeightPercent && flexHeight,
				maxWidthPercent = (o.maxWidth + "").indexOf("%") > -1 ? true : false,
				flexWidth = o.width == "flex",
				maxWidthPercentAndFlexWidth = maxWidthPercent && flexWidth,
				wdParent, htParent, $parent, parent, element = that.element,
				scale = that.getScale(),
				scaleX = scale[0],
				scaleY = scale[1],
				isFixed = element.css("position") == "fixed";
			if (self.isReactiveDims()) {
				$parent = dimsRelativeTo ? pq.isFn(dimsRelativeTo) ? dimsRelativeTo.call(that) : $(dimsRelativeTo) : element.parent();
				parent = $parent[0];
				if (!parent) {
					return
				}
				if (that._parent2 != parent) {
					that._parent2 = parent;
					pq.onResize(parent, self.onWindowResize.bind(self))
				}
				if (parent == document.body || isFixed) {
					wdParent = $(window).width();
					htParent = window.innerHeight || $(window).height();
					if (isFixed) {
						wdParent /= scaleX;
						htParent /= scaleY
					}
				} else {
					wdParent = pq.width($parent);
					htParent = pq.height($parent)
				}
				var calcOffset = this._calcOffset,
					widthOffset = widthPercent ? calcOffset(o.width) : 0,
					heightOffset = heightPercent ? calcOffset(o.height) : 0;
				if (maxWidthPercentAndFlexWidth) {
					wd = parseInt(o.maxWidth) * wdParent / 100
				} else if (widthPercent) {
					wd = parseInt(o.width) * wdParent / 100 + widthOffset
				}
				if (maxHeightPercentAndFlexHeight) {
					ht = parseInt(o.maxHeight) * htParent / 100
				} else if (heightPercent) {
					ht = parseInt(o.height) * htParent / 100 + heightOffset
				}
			}
			if (!wd) {
				if (flexWidth && o.maxWidth) {
					if (!maxWidthPercent) {
						wd = o.maxWidth
					}
				} else if (!widthPercent) {
					wd = o.width
				}
			}
			if (o.maxWidth) {
				this.maxWidthPixel = wd
			}
			if (!ht) {
				if (flexHeight && o.maxHeight) {
					if (!maxHeightPercent) {
						ht = o.maxHeight
					}
				} else if (!heightPercent) {
					ht = o.height
				}
			}
			if (parseFloat(wd) == wd) {
				wd = wd < o.minWidth ? o.minWidth : wd;
				element.css("width", wd)
			} else if (wd === "auto") {
				element.width(wd)
			}
			if (parseFloat(ht) == ht) {
				ht = ht < o.minHeight ? o.minHeight : ht;
				element.css("height", ht)
			}
			dims.wdGrid = pq.width(element);
			dims.htGrid = pq.height(element)
		},
		isReactiveDims: function() {
			var that = this.that,
				o = that.options,
				wd = o.width,
				ht = o.height,
				maxWd = o.maxWidth,
				maxHt = o.maxHeight,
				isPercent = function(val) {
					return (val + "").indexOf("%") != -1 ? true : false
				},
				widthPercent = isPercent(wd),
				autoWidth = wd === "auto",
				heightPercent = isPercent(ht),
				maxWdPercent = isPercent(maxWd),
				maxHtPercent = isPercent(maxHt);
			return widthPercent || autoWidth || heightPercent || maxWdPercent || maxHtPercent
		},
		getParentDims: function() {
			var that = this.that,
				$grid = that.element,
				wd, ht, parent = that._parent2,
				$parent = $(parent);
			if (parent) {
				if (parent == document.body || $grid.css("position") == "fixed") {
					ht = window.innerHeight || $(window).height();
					wd = $(window).width()
				} else {
					ht = $parent.height();
					wd = $parent.width()
				}
				return [wd, ht]
			}
			return []
		},
		onWindowResize: function(evt, ui) {
			var self = this,
				that = self.that,
				dims = that.dims || {},
				htParent = dims.htParent,
				wdParent = dims.wdParent,
				o = that.options,
				$grid = that.element,
				newHtParent, newWdParent, arr, isReactiveDims, ui_grid;
			if (!o || cRefresh.isFullScreen() || o.disabled) {
				return
			}
			if ($.support.touch && o.editModel.indices && $(document.activeElement).is(".pq-editor-focus")) {
				return
			}
			if (ui) {
				ui_grid = ui.$grid;
				if (ui_grid) {
					if (ui_grid == $grid || $grid.closest(ui_grid).length == 0) {
						return
					}
				}
			}
			isReactiveDims = self.isReactiveDims();
			if (cRefresh.ISZOOM) {
				return self.setResizeTimer(function() {
					self.refresh({
						soft: true
					})
				})
			}
			if (isReactiveDims) self.setResizeTimer(function() {
				arr = self.getParentDims(), newWdParent = arr[0], newHtParent = arr[1];
				if (newHtParent == htParent && newWdParent == wdParent) {
					if (parseInt(pq.width($grid)) == parseInt(dims.wdGrid)) {
						return
					}
				} else {
					dims.htParent = newHtParent;
					dims.wdParent = newWdParent
				}
				self.refresh({
					soft: true
				})
			})
		},
		setResizeTimer: function(fn) {
			var self = this,
				that = self.that;
			clearTimeout(self._autoResizeTimeout);
			self._autoResizeTimeout = window.setTimeout(function() {
				if (that.element) fn ? fn() : self.refreshAfterResize()
			}, that.options.autoSizeInterval || 100)
		},
		refresh: function(ui) {
			ui = ui || {};
			var self = this,
				that = self.that,
				pager = ui.pager,
				o, normal = !ui.soft,
				$grid = that.element,
				$tp = that.$toolPanel,
				tpWidth, dims = that.dims = that.dims || {
					htCenter: 0,
					htHead: 0,
					htSum: 0,
					htBody: 0,
					wdCenter: 0,
					htTblSum: 0
				};
			if (ui.colModel) {
				that.refreshCM()
			}
			if (!$grid[0].offsetWidth) {
				$grid.addClass("pq-pending-refresh");
				return
			}
			$tp.css("height", "1px");
			if (ui.toolbar) {
				that.refreshToolbar()
			}
			o = that.options;
			o.collapsible._collapsed = false;
			self.setMax("maxHeight");
			self.setMax("maxWidth");
			self.refreshGridWidthAndHeight();
			if (normal && pager !== false) {
				that._refreshPager()
			}
			dims.htCenter = self.setCenterHeight();
			tpWidth = $tp[0].offsetWidth;
			dims.wdCenter = dims.wdGrid - tpWidth;
			that.$grid_center.css("margin" + (o.rtl || (o.sideBar || {}).align == "left" ? "Left" : "Right"), tpWidth);
			that.iRenderB.init(Object.assign({
				header: true
			}, ui));
			o.height == "flex" && self.setGridAndCenterHeightForFlex();
			o.width == "flex" && self.setGridWidthForFlex();
			var arr = this.getParentDims();
			dims.wdParent = arr[0];
			dims.htParent = arr[1];
			normal && that._createCollapse();
			o.dataModel.postDataOnce = undefined;
			that._trigger("refreshFull")
		},
		setCenterHeight: function() {
			var that = this.that,
				$top = that.$top,
				o = that.options,
				ht;
			if (o.height !== "flex" || o.maxHeight) {
				ht = that.dims.htGrid - (o.showTop ? $top[0].offsetHeight + parseInt($top.css("marginTop")) : 0) - that.$bottom[0].offsetHeight;
				ht = ht >= 0 ? ht : "";
				that.$grid_center.height(ht)
			}
			return ht
		}
	}
})(jQuery);
(function($) {
	var cCheckBoxColumn = $.paramquery.cCheckBoxColumn = function(that, column) {
		var self = this,
			colCB, colUI;
		self.that = that;
		self.fns = {};
		self.options = that.options;
		colUI = self.colUI = column;
		if (column.cbId) colCB = self.colCB = that.columns[column.cbId];
		else colCB = self.colCB = column;
		var defObj = {
				all: false,
				header: false,
				select: false,
				check: true,
				uncheck: false
			},
			cb = colCB.cb = $.extend({}, defObj, colCB.cb),
			diCB = colCB.dataIndx;
		colUI._render = self.cellRender(colCB, colUI);
		self.on("dataAvailable", function() {
			that.one("dataReady", self.oneDataReady.bind(self))
		}).on("dataReady", self.onDataReady.bind(self)).on("valChange", self.onCheckBoxChange(self)).on("cellKeyDown", self.onCellKeyDown.bind(self)).on("refreshHeader", self.onRefreshHeader.bind(self)).on("change", self.onChange.bind(self));
		if (cb.select) {
			self.on("rowSelect", self.onRowSelect(self, that)).on("beforeRowSelectDone", self.onBeforeRowSelect(self, that, diCB, cb.check, cb.uncheck))
		}
		self.on("beforeCheck", self.onBeforeCheck.bind(self))
	};
	cCheckBoxColumn.prototype = $.extend({
		cellRender: function(colCB, colUI) {
			var self = this;
			return function(ui) {
				var grid = this,
					rd = ui.rowData,
					checked, disabled, diCB = colCB.dataIndx,
					cb = colCB.cb,
					renderLabel = colUI.renderLabel,
					useLabel = colUI.useLabel,
					text;
				if (rd.pq_gtitle || rd.pq_gsummary || ui.Export) {
					return
				}
				checked = cb.check === rd[diCB] ? "checked" : "";
				disabled = self.isEditable(rd, colCB, ui.rowIndx, grid.colIndxs[diCB], diCB, ui.rowIndxPage) ? "" : "disabled";
				if (renderLabel) {
					text = renderLabel.call(grid, ui)
				}
				if (text == null) {
					text = colCB == colUI ? "" : ui.formatVal || ui.cellData
				}
				return [useLabel ? " <label>" : "", "<input type='checkbox' tabindex='-1' ", checked, " ", disabled, " />", text, useLabel ? "</label>" : ""].join("")
			}
		},
		checkAll: function(check, evt) {
			check = check == null ? true : check;
			var that = this.that,
				cbAll = this.colCB.cb.all,
				data = cbAll ? that.options.dataModel.data : that.pdata;
			return this.checkNodes(data, check, evt)
		},
		checkNodes: function(nodes, check, evt) {
			if (!nodes.length) {
				return
			}
			if (check == null) check = true;
			var self = this,
				that = self.that,
				diUI = self.colUI.dataIndx,
				colCB = self.colCB,
				cb = colCB.cb,
				select = cb.select,
				header = cb.header,
				selectOrHeader = select || header,
				history = cb.history,
				useTxn = cb.useTxn,
				newVal = check ? cb.check : cb.uncheck,
				diCB = colCB.dataIndx,
				ciCB = that.colIndxs[diCB],
				riOffset = that.riOffset,
				node0 = nodes[0],
				ri0 = node0.pq_ri,
				node, ri, refreshCell = function() {
					that.refreshCell({
						rowIndx: ri0,
						dataIndx: diUI
					});
					return false
				},
				i = 0,
				len = nodes.length,
				rowList = [];
			for (; i < len; i++) {
				node = nodes[i];
				if (node && node[diCB] != newVal && self.isEditable(node, colCB, ri = node.pq_ri, ciCB, diCB, ri - riOffset)) {
					rowList.push({
						rowData: node,
						rowIndx: ri
					})
				}
			}
			var ui = {
				rowIndx: ri0,
				rowData: node0,
				dataIndx: diUI,
				check: check,
				rows: rowList,
				source: "checkbox"
			};
			if (that._trigger("beforeCheck", evt, ui) === false) {
				return refreshCell()
			}
			rowList = ui.rows;
			if (useTxn || useTxn != false && !selectOrHeader) {
				var dui = {
					source: "checkbox",
					updateList: rowList.map(function(obj) {
						var oldRow = {},
							newRow = {},
							rd = obj.rowData;
						oldRow[diCB] = rd[diCB];
						newRow[diCB] = newVal;
						return {
							rowIndx: obj.rowIndx,
							rowData: rd,
							oldRow: oldRow,
							newRow: newRow
						}
					})
				};
				dui.history = dui.track = history == null ? selectOrHeader ? false : null : history;
				if (that._digestData(dui) === false) {
					return refreshCell()
				}
			} else {
				i = 0, len = rowList.length;
				for (; i < len; i++) {
					node = rowList[i].rowData;
					node[diCB] = newVal;
					if (select) {
						node.pq_rowselect = check
					}
				}
				if (len) {
					if (select) {
						ui[check ? "addList" : "deleteList"] = rowList;
						that._trigger("rowSelect", evt, ui)
					}
					self.setValCBox();
					that._trigger("check", evt, ui)
				}
			}
			if (!cb.maxCheck && rowList.length == 1) that.refreshRow(rowList[0]);
			else {
				that.refresh({
					header: false,
					skipIndx: true
				})
			}
		},
		isEditable: function(rd, col, ri, ci, di, rip) {
			return this.that.isEditable({
				rowIndx: ri,
				rowData: rd,
				column: col,
				colIndx: ci,
				dataIndx: di,
				rowIndxPage: rip,
				normalized: true
			})
		},
		onBeforeRowSelect: function(self, that, cb_di, cb_check, cb_uncheck) {
			return function(evt, ui) {
				if (ui.source != "checkbox") {
					var fn = function(rows) {
						var ri, rd, row, riOffset = that.riOffset,
							i = rows.length,
							col = that.columns[cb_di],
							ci = that.colIndxs[cb_di];
						while (i--) {
							row = rows[i];
							ri = row.rowIndx;
							rd = row.rowData;
							if (self.isEditable(rd, col, ri, ci, cb_di, ri - riOffset)) {
								rd[cb_di] = rd.pq_rowselect ? cb_uncheck : cb_check
							} else {
								rows.splice(i, 1)
							}
						}
					};
					fn(ui.addList);
					fn(ui.deleteList)
				}
			}
		},
		onChange: function(evt, ui) {
			var self = this,
				colCB = self.colCB,
				cb = colCB.cb;
			var that = self.that,
				checkList = [],
				uncheckList = [],
				diUI = self.colUI.dataIndx,
				diCB = colCB.dataIndx,
				check = cb.check,
				trigger = function(list, check) {
					if (list.length) that._trigger("check", evt, {
						rows: list,
						dataIndx: diUI,
						rowIndx: list[0].rowIndx,
						rowData: list[0].rowData,
						check: check
					})
				},
				fn = function(rlist) {
					rlist.forEach(function(list) {
						var newRow = list.newRow,
							oldRow = list.oldRow,
							val;
						if (newRow.hasOwnProperty(diCB)) {
							val = newRow[diCB];
							if (val === check) {
								checkList.push(list)
							} else if (oldRow && oldRow[diCB] === check) {
								uncheckList.push(list)
							}
						}
					})
				};
			self.setValCBox();
			fn(ui.updateList);
			if (cb.select) {
				that.SelectRow().update({
					addList: checkList,
					deleteList: uncheckList,
					source: "checkbox"
				})
			}
			trigger(checkList, true);
			trigger(uncheckList, false)
		},
		onCheckBoxChange: function(self) {
			return function(_evt, ui) {
				if (ui.dataIndx == self.colUI.dataIndx) {
					return self.checkNodes([ui.rowData], ui.input.checked, _evt)
				}
			}
		},
		onDataReady: function() {
			this.setValCBox()
		},
		off: function() {
			var obj = this.fns,
				that = this.that,
				key;
			for (key in obj) {
				that.off(key, obj[key])
			}
			this.fns = {}
		},
		on: function(evt, fn) {
			var self = this;
			self.fns[evt] = fn;
			self.that.on(evt, fn);
			return self
		},
		destroy: function() {
			this.off();
			for (var key in this) delete this[key]
		},
		oneDataReady: function() {
			var that = this.that,
				rowData, data = that.get_p_data(),
				i = 0,
				len = data.length,
				column = this.colCB,
				cb = column.cb,
				dataIndx = column.dataIndx;
			if (dataIndx != null && data) {
				if (cb.select) {
					for (; i < len; i++) {
						if (rowData = data[i]) {
							if (rowData[dataIndx] === cb.check) {
								rowData.pq_rowselect = true
							} else if (rowData.pq_rowselect) {
								rowData[dataIndx] = cb.check
							}
						}
					}
				}
			}
		},
		onRowSelect: function(self, that) {
			return function(evt, ui) {
				if (ui.source != "checkbox") {
					if (ui.addList.length || ui.deleteList.length) {
						self.setValCBox();
						that.refresh({
							header: false,
							skipIndx: true
						})
					}
				}
			}
		}
	}, pq.mixin.ChkGrpTree)
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fni = {};
	fni.options = {
		initSSFn: true,
		stateColKeys: {
			width: 1,
			filter: ["crules", "mode"],
			hidden: 1
		},
		stateKeys: {
			height: 1,
			width: 1,
			freezeRows: 1,
			freezeCols: 1,
			groupModel: ["dataIndx", "collapsed", "grandSummary"],
			pageModel: ["curPage", "rPP"],
			sortModel: ["sorter"]
		},
		detailModel: {
			cache: true,
			offset: 100,
			expandIcon: "ui-icon-triangle-1-se",
			collapseIcon: "ui-icon-triangle-1-e",
			height: "auto"
		},
		dragColumns: {
			enabled: true,
			acceptIcon: "ui-icon-check",
			rejectIcon: "ui-icon-closethick",
			topIcon: "ui-icon-circle-arrow-s",
			bottomIcon: "ui-icon-circle-arrow-n"
		},
		flex: {
			on: true,
			one: false,
			all: true
		},
		track: null,
		mergeModel: {
			flex: false
		},
		realFocus: true,
		sortModel: {
			on: true,
			type: "local",
			multiKey: "shiftKey",
			number: true,
			single: true,
			cancel: true,
			sorter: [],
			useCache: true,
			ignoreCase: false
		},
		filterModel: {
			on: true,
			newDI: [],
			type: "local",
			mode: "AND",
			header: false,
			timeout: 400,
			appendTo: function() {
				var dialog, $grid = this.widget(),
					ret;
				if (dialog = $grid.closest(".ui-dialog")[0]) {
					ret = dialog
				}
				return ret
			}
		}
	};
	fni._create = function() {
		var that = this,
			o = that.options;
		if (o.rtl == null) o.rtl = that.element.css("direction") == "rtl";
		that.listeners = {};
		that._queueATriggers = {};
		that.iHistory = new _pq.cHistory(that);
		that.iGroup = new _pq.cGroup(that);
		that.iMerge = new _pq.cMerge(that);
		that.iFilterData = new _pq.cFilterData(that);
		that.iSelection = new pq.Selection(that);
		that.iUCData = new _pq.cUCData(that);
		that.iMouseSelection = new _pq.cMouseSelection(that);
		that._super();
		new _pq.cFormula(that);
		that.iDragColumns = new _pq.cDragColumns(that);
		that.refreshToolbar();
		if (o.dataModel.location === "remote") {
			that.refresh()
		}
		var timeoutId;
		that.on("dataAvailable", function() {
			that.one("refreshDone", function() {
				that._trigger("ready");
				clearTimeout(timeoutId);
				timeoutId = setTimeout(function() {
					if (that.element) {
						that._trigger("complete")
					}
				}, 0)
			})
		});
		that.refreshDataAndView({
			header: true
		})
	};
	$.widget("paramquery.pqGrid", _pq._pqGrid, fni);
	$.widget.extend = function() {
		var arr_shift = Array.prototype.shift,
			isPlainObject = $.isPlainObject,
			isArray = $.isArray,
			w_extend = $.widget.extend,
			target = arr_shift.apply(arguments),
			deep, _deep;
		if (typeof target == "boolean") {
			deep = target;
			target = arr_shift.apply(arguments)
		}
		var inputs = arguments,
			i = 0,
			len = inputs.length,
			input, fn, descriptor, key, val;
		if (deep == null) {
			deep = len > 1 ? true : false
		}
		for (; i < len; i++) {
			input = inputs[i];
			for (key in input) {
				descriptor = Object.getOwnPropertyDescriptor(input, key);
				if ((fn = descriptor.get) && fn.name != "reactiveGetter" || descriptor.set) {
					Object.defineProperty(target, key, descriptor);
					continue
				}
				val = input[key];
				if (val !== undefined) {
					_deep = i > 0 ? false : true;
					if (isPlainObject(val)) {
						if (val.byRef) {
							target[key] = val
						} else {
							target[key] = target[key] || {};
							w_extend(_deep, target[key], val)
						}
					} else if (isArray(val)) {
						target[key] = deep && _deep ? val.slice() : val
					} else {
						target[key] = val
					}
				}
			}
		}
		return target
	};
	pq.grid = function(selector, options) {
		var $g = $(selector).pqGrid(options),
			g = $g.data("paramqueryPqGrid") || $g.data("paramquery-pqGrid");
		return g
	};
	_pq.pqGrid.regional = {};
	var fn = _pq.pqGrid.prototype;
	_pq.pqGrid.defaults = fn.options;
	fn.focusT = function(ui) {
		var self = this;
		setTimeout(function() {
			self.focus(ui)
		})
	};
	fn.focus = function(ui) {
		this.iKeyNav.focus(ui)
	};
	fn.focusHead = function(ui) {
		this.iKeyNav.focusHead(ui)
	};
	fn.getFocus = function() {
		return this.iKeyNav.getFocus()
	};
	fn.callFn = function(cb, ui) {
		return pq.getFn(cb).call(this, ui)
	};
	fn.rowExpand = function(objP) {
		this.iHierarchy.rowExpand(objP)
	};
	fn.rowInvalidate = function(objP) {
		this.iHierarchy.rowInvalidate(objP)
	};
	fn.rowCollapse = function(objP) {
		this.iHierarchy.rowCollapse(objP)
	};
	fn.Detail = function() {
		return this.iHierarchy
	};
	fn.isFrozenPane = function() {
		var o = this.options;
		return o.freezeRows || o.freezeCols
	};
	fn.unfreezePanes = function() {
		var grid = this,
			o = grid.options;
		o.freezeRows = 0;
		o.freezeCols = 0;
		grid.refresh()
	};
	fn.freezeTopRow = function() {
		this.options.freezeRows = this.getFirstVisibleRIP() + 1;
		this.refresh()
	};
	fn.freezeFirstCol = function() {
		this.options.freezeCols = this.getFirstVisibleCI() + 1;
		this.refresh()
	};
	fn._saveState = function(source, dest, stateKeys) {
		var key, model, oModel, obj, self = this;
		for (key in stateKeys) {
			model = stateKeys[key];
			if (model) {
				oModel = source[key];
				if ($.isArray(model)) {
					if (oModel != null) {
						obj = dest[key] = $.isPlainObject(dest[key]) ? dest[key] : {};
						model.forEach(function(prop) {
							obj[prop] = oModel[prop]
						})
					}
				} else if (oModel && key == "colModel") {
					dest[key] = [];
					oModel.forEach(col => {
						var col2 = {};
						dest[key].push(col2);
						self._saveState(col, col2, stateKeys)
					})
				} else dest[key] = oModel
			}
		}
	};
	fn.saveState = function(ui) {
		ui = ui || {};
		var self = this,
			$grid = self.element,
			extra, o = self.options,
			stateColKeys = o.stateColKeys,
			stateKeys = o.stateKeys,
			CM = o.colModel,
			sCM = [],
			column, sCol, i = 0,
			CMlen = CM.length,
			state, id = $grid[0].id;
		stateColKeys.colModel = 1;
		stateColKeys.dataIndx = 1;
		for (; i < CMlen; i++) {
			column = CM[i];
			sCol = {};
			self._saveState(column, sCol, stateColKeys);
			sCM[i] = sCol
		}
		state = {
			colModel: sCM,
			datestamp: Date.now()
		};
		self._saveState(o, state, stateKeys);
		if (extra = ui.extra) state = $.extend(true, state, extra);
		if (ui.stringify !== false) {
			state = JSON.stringify(state);
			if (ui.save !== false && typeof Storage !== "undefined") {
				localStorage.setItem("pq-grid" + (id || ""), state)
			}
		}
		return state
	};
	fn.getState = function() {
		if (typeof Storage !== "undefined") return localStorage.getItem("pq-grid" + (this.element[0].id || ""))
	};
	fn.loadState = function(ui) {
		ui = ui || {};
		var self = this,
			obj, wextend = $.widget.extend,
			state = ui.state || self.getState();
		if (!state) {
			return false
		} else if (pq.isStr(state)) {
			state = JSON.parse(state)
		}
		var CMstate = state.colModel,
			topParentId = "pid" + Math.random(),
			columnsSt = {},
			colOrderSt = {},
			columnsD = {},
			colOrderD = {},
			o = self.options,
			idCol = col => col.dataIndx || col.id || col.title,
			stateColKeys = (x => {
				delete x.colModel;
				delete x.dataIndx;
				return x
			})(o.stateColKeys),
			oCM = o.colModel,
			saveOrderAndColumns = (CM, parentId, colOrder, columns) => {
				var order = colOrder[parentId] = {};
				CM.forEach((col, i) => {
					var id = idCol(col);
					col.parentId = parentId;
					columns[id] = col;
					order[id] = i;
					if (col.colModel) {
						saveOrderAndColumns(col.colModel, id, colOrder, columns)
					}
				})
			};
		saveOrderAndColumns(CMstate, topParentId, colOrderSt, columnsSt);
		saveOrderAndColumns(oCM, topParentId, colOrderD, columnsD);
		for (var id in columnsD) {
			var colSt = columnsSt[id],
				colD = columnsD[id];
			if (colSt) {
				if (colD.parentId != colSt.parentId) {
					var parentOld = columnsD[colD.parentId],
						parentNew = columnsD[colSt.parentId];
					if (parentNew) {
						parentOld.colModel.splice(parentOld.colModel.indexOf(colD), 1);
						parentNew.colModel.push(colD)
					}
				}
				self._saveState(colSt, colD, stateColKeys)
			}
		}

		function sort(CM, id) {
			var order = colOrderSt[id];
			if (order) {
				CM.sort(function(col1, col2) {
					return order[idCol(col1)] - order[idCol(col2)]
				})
			}
			CM.forEach(col => {
				delete col.parentId;
				var cm2 = col.colModel || [];
				if (cm2.length) {
					sort(cm2, idCol(col))
				}
			})
		}
		sort(oCM, topParentId);
		self.iCols.init();
		wextend(o.sortModel, state.sortModel);
		wextend(o.pageModel, state.pageModel);
		self.Group().option(state.groupModel, false);
		self.Tree().option(state.treeModel, false);
		obj = {
			freezeRows: state.freezeRows,
			freezeCols: state.freezeCols
		};
		if (!isNaN(o.height * 1) && !isNaN(state.height * 1)) {
			obj.height = state.height
		}
		if (!isNaN(o.width * 1) && !isNaN(state.width * 1)) {
			obj.width = state.width
		}
		self.option(obj);
		if (ui.refresh !== false) {
			self.refreshDataAndView()
		}
		return true
	};
	fn.refreshToolbar = function() {
		var that = this,
			options = that.options,
			tb = options.toolbar,
			_toolbar;
		if (that._toolbar) {
			_toolbar = that._toolbar;
			_toolbar.destroy()
		}
		if (tb) {
			var cls = tb.cls || "",
				style = tb.style || "",
				attr = tb.attr || "",
				items = tb.items,
				$toolbar = $("<div class='" + cls + "' style='" + style + "' " + attr + " ></div>");
			if (_toolbar) {
				_toolbar.widget().replaceWith($toolbar)
			} else {
				that.$top.append($toolbar)
			}
			_toolbar = pq.toolbar($toolbar, {
				items: items,
				gridInstance: that,
				bootstrap: options.bootstrap
			});
			if (!options.showToolbar) {
				$toolbar.css("display", "none")
			}
			that._toolbar = _toolbar
		}
	};
	fn.filter = function(objP) {
		return this.iFilterData.filter(objP)
	};
	fn.Checkbox = function(di) {
		return this.iCheckBox[di]
	};
	fn.refreshHeader = function() {
		this.iRenderHead.refreshHS()
	};
	fn.refreshSummary = function() {
		this.iRenderSum.refreshHS()
	};
	fn.refreshHeaderFilter = function(ui) {
		var obj = this.normalize(ui),
			ci = obj.colIndx,
			column = obj.column,
			iH = this.iRenderHead,
			rowData = {},
			rip = iH.rows - 1;
		if (this.options.filterModel.header) {
			iH.refreshCell(rip, ci, rowData, column);
			iH.postRenderCell(column, ci, rip)
		}
	};
	fn.pageData = function() {
		return this.pdata
	};

	function _getData(data, dataIndices, arr) {
		for (var i = 0, len = data.length; i < len; i++) {
			var rowData = data[i],
				row = {},
				dataIndx, j = 0,
				dILen = dataIndices.length;
			for (; j < dILen; j++) {
				dataIndx = dataIndices[j];
				row[dataIndx] = rowData[dataIndx]
			}
			arr.push(row)
		}
	}
	fn.getData = function(ui) {
		ui = ui || {};
		var dataIndices = ui.dataIndx,
			dILen = dataIndices ? dataIndices.length : 0,
			data = ui.data,
			useCustomSort = !dILen,
			columns = this.columns,
			DM = this.options.dataModel,
			DMData = DM.dataPrimary || DM.data || [],
			DMDataUF = DM.dataUF || [],
			arr = [];
		if (dILen) {
			if (data) {
				_getData(data, dataIndices, arr)
			} else {
				_getData(DMData, dataIndices, arr);
				_getData(DMDataUF, dataIndices, arr)
			}
		} else {
			return DMDataUF.length ? DMData.concat(DMDataUF) : DMData
		}
		var arr2 = [],
			sorters = dataIndices.reduce(function(arr, di) {
				var column = columns[di];
				if (column) arr.push({
					dataIndx: di,
					dir: "up",
					dataType: column.dataType,
					sortType: column.sortType
				});
				return arr
			}, []),
			obj = {};
		for (var i = 0, len = arr.length; i < len; i++) {
			var rowData = arr[i],
				item = JSON.stringify(rowData);
			if (!obj[item]) {
				arr2.push(rowData);
				obj[item] = 1
			}
		}
		arr2 = this.iSort._sortLocalData(sorters, arr2, useCustomSort);
		return arr2
	};
	fn.getPlainOptions = function(options, di) {
		var item = options[0];
		if ($.isPlainObject(item)) {
			var keys = Object.keys(item);
			if (keys[0] != di && keys.length == 1) {
				options = options.map(function(item) {
					var obj = {},
						key;
					for (key in item) {
						obj[di] = key;
						obj.pq_label = item[key]
					}
					return obj
				})
			}
		} else {
			options = options.map(function(val) {
				var opt = {};
				opt[di] = val;
				return opt
			})
		}
		return options
	};
	fn.getDataCascade = function(di, diG, diExtra) {
		var grid = this,
			FM = grid.options.filterModel,
			order = FM.newDI.slice(),
			rules, dataIndx = diG ? [diG, di] : [di],
			index = order.indexOf(di),
			data, mode = FM.mode;
		if (mode == "AND" && order.length && FM.type != "remote") {
			if (index >= 0) {
				order.splice(index, order.length)
			}
			if (order.length) {
				rules = order.map(function(_di) {
					var filter = grid.getColumn({
							dataIndx: _di
						}).filter,
						rules = filter.crules || [filter];
					return {
						dataIndx: _di,
						crules: rules,
						mode: filter.mode
					}
				});
				data = grid.filter({
					data: grid.getData(),
					mode: "AND",
					rules: rules
				})
			}
		}
		dataIndx = dataIndx.concat(diExtra || []);
		return grid.getData({
			data: data,
			dataIndx: dataIndx
		})
	};
	fn.removeNullOptions = function(data, di, diG) {
		var firstEmpty;
		if (diG == null) {
			return data.filter(function(rd) {
				var val = rd[di];
				if (val == null || val === "") {
					if (!firstEmpty) {
						firstEmpty = true;
						rd[di] = "";
						return true
					}
				} else {
					return true
				}
			})
		} else {
			return data.filter(function(rd) {
				var val = rd[di];
				if (val == null || val === "") {
					return false
				}
				return true
			})
		}
	};
	fn.get_p_data = function() {
		var o = this.options,
			PM = o.pageModel,
			paging = PM.type,
			remotePaging, data = o.dataModel.data,
			pdata = this.pdata,
			rpp, offset, arr = [],
			arr2;
		if (paging) {
			rpp = PM.rPP;
			offset = this.riOffset || 0;
			if (!pdata.length && data.length) {
				pdata = data.slice(offset, offset + rpp)
			}
			remotePaging = paging == "remote";
			arr = remotePaging ? new Array(offset) : data.slice(0, offset);
			arr2 = remotePaging ? [] : data.slice(offset + rpp);
			return arr.concat(pdata, arr2)
		} else {
			return pdata.length ? pdata : data
		}
	};
	fn._onDataAvailable = function(objP) {
		objP = objP || {};
		var self = this,
			options = self.options,
			apply = !objP.data,
			source = objP.source,
			sort = objP.sort,
			data = [],
			FM = options.filterModel,
			DM = options.dataModel,
			SM = options.sortModel;
		self.iRefresh.addRT(objP.data);
		if (apply !== false) {
			self.pdata = [];
			if (objP.trigger !== false) {
				self._trigger("dataAvailable", objP.evt, {
					source: source
				})
			}
		}
		if (FM && FM.on && FM.type == "local" && objP.filter != false) {
			data = self.iFilterData.filterLocalData(objP).data
		} else {
			data = DM.data
		}
		if (SM.type == "local") {
			if (sort !== false) {
				if (apply) {
					self.sort({
						refresh: false
					})
				} else {
					data = self.iSort.sortLocalData(data, true)
				}
			}
		}
		if (apply === false) {
			return data
		}
		self.refreshView(objP)
	};
	fn.reset = function(ui) {
		ui = ui || {};
		var self = this,
			sort = ui.sort,
			o = self.options,
			refresh = ui.refresh !== false,
			extend = $.extend,
			sortModel, groupModel, filter = ui.filter,
			group = ui.group;
		if (!sort && !filter && !group) {
			return
		}
		if (sort) {
			sortModel = sort === true ? {
				sorter: []
			} : sort;
			extend(o.sortModel, sortModel)
		}
		if (filter) {
			!refresh && this.iFilterData.clearFilters(self.colModel)
		}
		if (group) {
			groupModel = group === true ? {
				dataIndx: []
			} : group;
			self.groupOption(groupModel, false)
		}
		if (refresh) {
			if (filter) {
				self.filter({
					oper: "replace",
					rules: []
				});
				self.refreshHeader()
			} else if (sort) {
				self.sort()
			} else {
				self.refreshView()
			}
		}
	};
	fn._trigger = _pq._trigger;
	fn.on = _pq.on;
	fn.one = _pq.one;
	fn.off = _pq.off;
	fn.pager = function() {
		var p;
		this.pageI = this.pageI || ((p = this.widget().find(".pq-pager")).length ? p.pqPager("instance") : null);
		return this.pageI
	};
	fn.toolbar = function(selector) {
		var $t = (this._toolbar || {}).element;
		return selector ? $t.find(selector) : $t
	};
	fn.Columns = function() {
		return this.iCols
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.cColModel = function(that) {
		this.that = that;
		this.vciArr;
		this.ciArr;
		this.init()
	};
	_pq.cColModel.prototype = {
		add: function(columns, ci, CM, source) {
			var self = this,
				that = self.that,
				CM = CM || that.options.colModel,
				ci = ci == null ? CM.length : ci,
				ui = {
					args: arguments
				},
				parent, CM2, n = columns.length,
				params = [ci, 0].concat(columns);
			if (that._trigger("beforeColAdd", null, ui) !== false) {
				source == "undo" || source == "redo" || that.iHistory.push({
					callback: function(redo) {
						CM2 = (parent || {}).colModel;
						if (redo) self.add(columns, ci, CM2, "redo");
						else self.remove(n, ci, CM2, "undo")
					}
				});
				CM.splice.apply(CM, params);
				that.refreshCM();
				parent = CM[0].parent;
				that._trigger("colAdd", null, ui);
				that.refresh()
			}
		},
		move: function(howmany, fromindx, toindx, fromParent, toParent, source) {
			var self = this,
				to, ui = {
					args: arguments
				},
				that = self.that,
				o = that.options,
				columns = [],
				CM = o.colModel,
				fromCM = (fromParent || {}).colModel || CM,
				toCM = (toParent || {}).colModel || CM;
			if (that._trigger("beforeColMove", null, ui) !== false) {
				source == "undo" || source == "redo" || that.iHistory.push({
					callback: function(redo) {
						if (redo) self.move(howmany, fromindx, toindx, fromParent, toParent, "redo");
						else {
							self.move(howmany, to, fromCM == toCM && fromindx > to ? fromindx + howmany : fromindx, toParent, fromParent, "undo")
						}
					}
				});
				columns = fromCM.splice(fromindx, howmany);
				if (fromCM == toCM && toindx > fromindx + howmany) to = toindx - howmany;
				else to = toindx;
				toCM.splice.apply(toCM, [to, 0].concat(columns));
				that.refreshCM();
				that._trigger("colMove", null, ui);
				that.refresh({
					skipIndx: true
				})
			}
			return columns
		},
		remove: function(n, ci, CM, source) {
			var self = this,
				ui = {
					args: arguments
				},
				that = self.that,
				columns, iCheckBox = that.iCheckBox,
				CM = CM || that.options.colModel,
				CM2, parent = CM[0].parent;
			if (that._trigger("beforeColRemove", null, ui) !== false) {
				source == "undo" || source == "redo" || that.iHistory.push({
					callback: function(redo) {
						CM2 = (parent || {}).colModel;
						if (redo) self.remove(n, ci, CM2, "redo");
						else self.add(columns, ci, CM2, "undo")
					}
				});
				columns = CM.splice(ci, n);
				that.refreshCM();
				that._trigger("colRemove", null, ui);
				that.refresh()
			}
		},
		alter: function(cb) {
			var that = this.that;
			cb.call(that);
			that.refreshCM();
			that.refresh()
		},
		setRowSpan: function(headerCells) {
			var CMLength = headerCells[0].length,
				column, column2, row, row2, rowSpan, depth = headerCells.length,
				col = 0;
			for (; col < CMLength; col++) {
				for (row = 0; row < depth; row++) {
					column = headerCells[row][col];
					if (col > 0 && column == headerCells[row][col - 1]) {
						continue
					} else if (row > 0 && column == headerCells[row - 1][col]) {
						continue
					}
					rowSpan = 1;
					for (row2 = row + 1; row2 < depth; row2++) {
						column2 = headerCells[row2][col];
						if (column == column2) {
							rowSpan++
						}
					}
					column.rowSpan = rowSpan
				}
			}
			return headerCells
		},
		noRowSpan: function(headerCells) {
			var CMLength = headerCells[0].length,
				column, column2, row, depth = headerCells.length,
				col = 0;
			for (; col < CMLength; col++) {
				for (row = 0; row < depth; row++) {
					column = headerCells[row][col];
					column2 = (headerCells[row + 1] || {})[col];
					if (column == column2) {
						headerCells[row][col] = {
							hidden: column2.hidden,
							empty: true
						}
					} else {
						column.rowSpan = 1
					}
				}
			}
			return headerCells
		},
		autoGenColumns: function() {
			var that = this.that,
				o = that.options,
				CT = o.columnTemplate || {},
				CT_dataType = CT.dataType,
				CT_title = CT.title,
				CT_width = CT.width,
				data = o.dataModel.data,
				val = pq.valid,
				CM = [];
			if (data && data.length) {
				var rowData = data[0];
				$.each(rowData, function(indx, cellData) {
					var dataType = "string";
					if (val.isInt(cellData)) {
						if (cellData + "".indexOf(".") > -1) {
							dataType = "float"
						} else {
							dataType = "integer"
						}
					} else if (val.isDate(cellData)) {
						dataType = "date"
					} else if (val.isFloat(cellData)) {
						dataType = "float"
					}
					CM.push({
						dataType: CT_dataType ? CT_dataType : dataType,
						dataIndx: indx,
						title: CT_title ? CT_title : indx,
						width: CT_width ? CT_width : 100
					})
				})
			}
			o.colModel = CM
		},
		cacheIndices: function() {
			var self = this,
				that = self.that,
				isJSON = self.getDataType() == "JSON" ? true : false,
				columns = {},
				colIndxs = {},
				validations = {},
				CM = that.colModel,
				i = 0,
				valids, dataType, CMLength = CM.length,
				vci = 0,
				vciArr = self.vciArr = [],
				ciArr = self.ciArr = [];
			for (; i < CMLength; i++) {
				var column = CM[i],
					dataIndx = column.dataIndx;
				if (dataIndx == null) {
					dataIndx = column.type == "detail" ? "pq_detail" : isJSON ? "dataIndx_" + i : i;
					if (dataIndx == "pq_detail") {
						column.dataType = "object"
					}
					column.dataIndx = dataIndx
				}
				columns[dataIndx] = column;
				colIndxs[dataIndx] = i;
				valids = column.validations;
				if (valids) {
					validations[dataIndx] = validations
				}
				if (!column.hidden) {
					ciArr[vci] = i;
					vciArr[i] = vci;
					vci++
				}
				if (!column.align) {
					dataType = column.dataType;
					if (dataType && (dataType == "integer" || dataType == "float")) column.align = "right"
				}
			}
			that.columns = columns;
			that.colIndxs = colIndxs;
			that.validations = validations
		},
		collapse: function(column) {
			var collapsible = column.collapsible,
				close = collapsible.on || false,
				CM = column.colModel || [],
				len = CM.length,
				i = len,
				col, x, hidden, hiddenCols = 0,
				last = collapsible.last,
				indx = last ? len - 1 : 0;
			if (len) {
				while (i--) {
					col = CM[i];
					if (last === null) {
						hidden = col.showifOpen === close;
						if (hidden) hiddenCols++
					} else hidden = indx === i ? false : close;
					col.hidden = hidden;
					if (!hidden && (x = col.colModel) && !col.collapsible) this.each(function(_col) {
						_col.hidden = hidden
					}, x)
				}
				if (hiddenCols == len) {
					this.each(function(_col) {
						_col.hidden = false
					}, [CM[0]])
				}
			}
		},
		each: function(cb, cm) {
			var that = this.that;
			(cm || that.options.colModel).forEach(function(col) {
				cb.call(that, col);
				col.colModel && this.each(cb, col.colModel)
			}, this)
		},
		extend: function(CM, CMT) {
			var i = CM.length;
			while (i--) {
				var column = CM[i];
				CMT && pq.extendT(column, CMT)
			}
		},
		find: function(cb, _cm) {
			var that = this.that,
				CM = _cm || that.options.colModel,
				i = 0,
				len = CM.length,
				col, ret;
			for (; i < len; i++) {
				col = CM[i];
				if (cb.call(that, col)) {
					return col
				}
				if (col.colModel) {
					ret = this.find(cb, col.colModel);
					if (ret) return ret
				}
			}
		},
		getHeaderCells: function(optColModel) {
			var self = this,
				that = self.that,
				o = that.options,
				obj = self.nestedCols(optColModel),
				depth = obj.depth,
				CM = obj.colModel,
				CMLength = CM.length,
				childCount, ci, column, t, arr = [],
				ri = 0;
			for (; ri < depth; ri++) {
				arr[ri] = [];
				var k = 0,
					childCountSum = 0;
				for (ci = 0; ci < CMLength; ci++) {
					if (ri == 0) {
						column = optColModel[k]
					} else {
						var parentColumn = arr[ri - 1][ci],
							children = parentColumn.colModel;
						if (!children || children.length == 0) {
							column = parentColumn
						} else {
							var diff = ci - parentColumn.leftPos,
								childCountSum2 = 0,
								tt = 0;
							for (t = 0; t < children.length; t++) {
								childCountSum2 += children[t].childCount > 0 ? children[t].childCount : 1;
								if (diff < childCountSum2) {
									tt = t;
									break
								}
							}
							column = children[tt]
						}
					}
					childCount = column.childCount || 1;
					if (ci == childCountSum) {
						column.leftPos = ci;
						arr[ri][ci] = column;
						childCountSum += childCount;
						if (optColModel[k + 1]) {
							k++
						}
					} else {
						arr[ri][ci] = arr[ri][ci - 1]
					}
				}
			}
			self[o.rowSpanHead ? "setRowSpan" : "noRowSpan"](arr);
			return [arr, CM]
		},
		getDataType: function() {
			var CM = this.colModel;
			if (CM && CM[0]) {
				var dataIndx = CM[0].dataIndx;
				if (pq.isStr(dataIndx)) {
					return "JSON"
				} else {
					return "ARRAY"
				}
			}
		},
		getci: function(vci) {
			return this.ciArr[vci]
		},
		getvci: function(ci) {
			return this.vciArr[ci]
		},
		getNextVisibleCI: function(ci) {
			var vciArr = this.vciArr,
				len = this.that.colModel.length;
			for (; ci < len; ci++) {
				if (vciArr[ci] != null) {
					return ci
				}
			}
		},
		getPrevVisibleCI: function(ci) {
			var vciArr = this.vciArr;
			for (; ci >= 0; ci--) {
				if (vciArr[ci] != null) {
					return ci
				}
			}
		},
		getLastVisibleCI: function() {
			var arr = this.ciArr;
			return arr[arr.length - 1]
		},
		getVisibleTotal: function() {
			return this.ciArr.length
		},
		hide: function(ui) {
			var that = this.that,
				columns = that.columns;
			ui.diShow = ui.diShow || [];
			ui.diHide = ui.diHide || [];
			if (that._trigger("beforeHideCols", null, ui) !== false) {
				ui.diShow = ui.diShow.filter(function(di) {
					var col = columns[di];
					if (col.hidden) {
						delete col.hidden;
						return true
					}
				});
				ui.diHide = ui.diHide.filter(function(di) {
					var col = columns[di];
					if (!col.hidden) {
						col.hidden = true;
						return true
					}
				});
				that._trigger("hideCols", null, ui);
				that.refresh({
					colModel: true
				})
			}
		},
		init: function(ui) {
			var self = this,
				that = self.that,
				o = that.options,
				hc, arr, CMT = o.columnTemplate,
				CM, oCM = o.colModel;
			if (!oCM) {
				self.autoGenColumns();
				oCM = o.colModel
			}
			arr = self.getHeaderCells(oCM);
			hc = that.headerCells = arr[0];
			that.depth = hc.length;
			CM = that.colModel = arr[1];
			if (CMT) {
				self.extend(CM, CMT)
			}
			self.cacheIndices();
			self.initTypeColumns();
			that._trigger("CMInit", null, ui)
		},
		initTypeColumns: function() {
			var that = this.that,
				CM = that.colModel,
				i = 0,
				len = CM.length,
				di, columns = that.columns,
				iCB = that.iCheckBox = that.iCheckBox || {};
			for (di in iCB) {
				if (iCB[di].colUI != columns[di]) {
					iCB[di].destroy();
					delete iCB[di]
				}
			}
			for (; i < len; i++) {
				var column = CM[i],
					type = column.type;
				if (type) {
					if (type == "checkbox" || type == "checkBoxSelection") {
						di = column.dataIndx;
						column.type = "checkbox";
						iCB[di] = iCB[di] || new _pq.cCheckBoxColumn(that, column)
					} else if (type == "detail" && !that.iHierarchy) {
						column.dataIndx = "pq_detail";
						that.iHierarchy = new _pq.cHierarchy(that, column)
					}
				}
			}
		},
		nestedCols: function(colMarr, _depth, _hidden, parent) {
			var len = colMarr.length,
				arr = [],
				skipExport = "skipExport",
				_depth = _depth || 1,
				i = 0,
				new_depth = _depth,
				colSpan = 0,
				width = 0,
				childCount = 0,
				o_colspan = 0;
			for (; i < len; i++) {
				var column = colMarr[i],
					child_CM = column.colModel,
					obj;
				column.parent = parent;
				if (_hidden === true) {
					column.hidden = _hidden
				}
				if (parent && parent[skipExport] && column[skipExport] == null) {
					column[skipExport] = true
				}
				if (child_CM && child_CM.length) {
					column.collapsible && this.collapse(column);
					obj = this.nestedCols(child_CM, _depth + 1, column.hidden, column);
					arr = arr.concat(obj.colModel);
					if (obj.colSpan > 0) {
						if (obj.depth > new_depth) {
							new_depth = obj.depth
						}
						column.colSpan = obj.colSpan;
						colSpan += obj.colSpan
					} else {
						column.colSpan = 0
					}
					o_colspan += obj.o_colspan;
					column.o_colspan = obj.o_colspan;
					column.childCount = obj.childCount;
					childCount += obj.childCount
				} else {
					if (column.hidden) {
						column.colSpan = 0
					} else {
						column.colSpan = 1;
						colSpan++
					}
					o_colspan++;
					column.o_colspan = 1;
					column.childCount = 0;
					childCount++;
					arr.push(column)
				}
			}
			return {
				depth: new_depth,
				colModel: arr,
				colSpan: colSpan,
				width: width,
				childCount: childCount,
				o_colspan: o_colspan
			}
		},
		reduce: function(cb, cm) {
			var that = this.that,
				newCM = [];
			(cm || that.options.colModel).forEach(function(col, ci) {
				var newCol = cb.call(that, col, ci),
					ret, _cm;
				if (newCol) {
					_cm = newCol.colModel;
					if (_cm && _cm.length) {
						ret = this.reduce(cb, _cm);
						if (ret.length) {
							newCol.colModel = ret;
							newCM.push(newCol)
						}
					} else {
						newCM.push(newCol)
					}
				}
			}, this);
			return newCM
		},
		reverse: function(cm) {
			var self = this,
				that = self.that,
				c;
			(cm || that.options.colModel).reverse().forEach(function(col) {
				(c = col.colModel) && self.reverse(c)
			});
			if (!cm) that.refreshCM()
		}
	}
})(jQuery);
(function($) {
	$.extend($.paramquery.pqGrid.prototype, {
		parent: function() {
			return this._parent
		},
		child: function(_ui) {
			var ui = this.normalize(_ui),
				rd = ui.rowData || {},
				pq_detail = rd.pq_detail || {},
				child = pq_detail.child;
			return child
		}
	});

	function cHierarchy(that, column) {
		var self = this,
			o = that.options,
			DTM = o.detailModel,
			DMht;
		self.that = that;
		self.type = "detail";
		self.refreshComplete = true;
		self.rowHtDetail = (DMht = DTM.height) == "auto" ? 1 : DMht;
		that.on("cellClick headerCellClick cellKeyDown", self.onClick.bind(self)).on("beforeViewEmpty", self.onBeforeViewEmpty.bind(self)).on("autoRowHeight", self.onAutoRowHeight.bind(self)).one("render", function() {
			that.iRenderB.removeView = self.removeView(self, that);
			that.iRenderB.renderView = self.renderView(self, that)
		}).one("destroy", self.onDestroy.bind(self)).on("columnResize", self.onColumnResize.bind(self));
		column._render = self.renderCell.bind(self);
		if (DTM.header) column.title = function() {
			return "<div class='pq-icon-detail ui-icon " + (DTM.expandAll ? DTM.expandIcon : DTM.collapseIcon) + "'></div>"
		}
	}
	$.paramquery.cHierarchy = cHierarchy;
	cHierarchy.prototype = {
		detachCells: function($cells) {
			$cells.children().detach();
			$cells.remove()
		},
		onColumnResize: function() {
			var self = this,
				padding = self.getPadding();
			self.that.iRenderB.eachV(function(rd, ri) {
				$("#" + self.getId(ri)).css(padding)
			})
		},
		getCls: function() {
			return "pq-detail-cont-" + this.that.uuid
		},
		getId: function(rip) {
			return "pq-detail-" + rip + "-" + this.that.uuid
		},
		getRip: function(div) {
			return div.id.split("-")[2] * 1
		},
		onAutoRowHeight: function() {
			var self = this,
				iR = this.that.iRenderB;
			iR.$ele.find("." + self.getCls()).each(function(i, detail) {
				var rip = self.getRip(detail),
					top = iR.getHeightCell(rip);
				$(detail).css("top", top)
			})
		},
		onBeforeViewEmpty: function(evt, ui) {
			var rip = ui.rowIndxPage,
				iR = this.that.iRenderB,
				region = ui.region,
				selector = rip >= 0 ? "#" + this.getId(rip) : "." + this.getCls(),
				$details = rip >= 0 ? iR.$ele.find(selector) : iR["$c" + region].find(selector);
			this.detachCells($details)
		},
		onDestroy: function() {
			(this.that.getData() || []).forEach(function(rd) {
				rd.child && rd.child.remove()
			})
		},
		onResize: function(self, $cell) {
			var arr = [],
				timeID;
			pq.onResize($cell[0], function() {
				var $grid = self.that.widget();
				if (!$grid || $grid.is(":hidden")) return;
				arr.push($cell[0]);
				clearTimeout(timeID);
				timeID = setTimeout(function() {
					var pdata = self.that.pdata,
						arr2 = [];
					arr.forEach(function(ele) {
						if (document.body.contains(ele)) {
							var rip = self.getRip(ele),
								newHt = ele.offsetHeight,
								rd = pdata[rip],
								oldHt = rd.pq_detail.height || self.rowHtDetail;
							if (oldHt != newHt) {
								rd.pq_detail.height = newHt;
								arr2.push([rip, newHt - oldHt])
							}
						}
					});
					arr = [];
					if (arr2.length) {
						self.that._trigger("onResizeHierarchy");
						self.softRefresh(arr2)
					}
				}, 150)
			})
		},
		removeView: function(self, that) {
			var orig = that.iRenderB.removeView;
			return function(r1, r2, c1) {
				var ret = orig.apply(this, arguments),
					cls = self.getCls(),
					i, row, $row, $detail, region = this.getCellRegion(r1, c1);
				for (i = r1; i <= r2; i++) {
					row = this.getRow(i, region);
					if (row && row.children.length == 1) {
						$row = $(row);
						$detail = $row.children("." + cls);
						if ($detail.length == 1) {
							self.detachCells($detail);
							row.parentNode.removeChild(row)
						}
					}
				}
				return ret
			}
		},
		getPadding: function() {
			var that = this.that,
				o = that.options,
				obj = {},
				paddingLeft = that.dims.wdContLeft + 5;
			obj["padding" + (o.rtl ? "Right" : "Left")] = paddingLeft;
			return obj
		},
		renderView: function(self, that) {
			var orig = that.iRenderB.renderView;
			return function(r1, r2, c1, c2) {
				var ret = orig.apply(this, arguments),
					iR = that.iRenderB;
				var cls = self.getCls() + " pq-detail",
					o = that.options,
					ri, rowData, padding = self.getPadding(),
					fr = o.freezeRows,
					DM = o.detailModel,
					initDetail = DM.init,
					data = this.data;
				if (!self.refreshComplete) {
					return
				}
				self.refreshComplete = false;
				for (ri = r1; ri <= r2; ri++) {
					rowData = data[ri];
					if (rowData && !rowData.pq_hidden) {
						var pq_detail = rowData.pq_detail = rowData.pq_detail || {},
							show = pq_detail.show,
							$detail = pq_detail.child;
						if (!show) continue;
						if (!$detail) {
							if (pq.isFn(initDetail)) {
								$detail = initDetail.call(that, {
									rowData: rowData
								});
								pq_detail.child = $detail
							}
						}
						var $cell = $detail.parent(),
							top = iR.getHeightCell(ri),
							style = "position:absolute;left:0;top:" + top + "px;padding:5px;width:100%;overflow:hidden;";
						if ($cell.length) {
							if (!document.body.contains($cell[0])) {
								throw "incorrectly detached detail"
							}
							$cell.css({
								top: top
							})
						} else {
							$cell = $("<div role='gridcell' id='" + self.getId(ri) + "' class='" + cls + "' style='" + style + "'></div>").append($detail);
							$(iR.getRow(ri, ri < fr ? "tr" : "right")).append($cell);
							if (DM.height == "auto") self.onResize(self, $cell)
						}
						$cell.css(padding);
						var $grids = $cell.find(".pq-grid"),
							j = 0,
							gridLen = $grids.length,
							$grid, grid;
						for (; j < gridLen; j++) {
							$grid = $($grids[j]);
							grid = $grid.pqGrid("instance");
							grid._parent = that;
							if ($grid.hasClass("pq-pending-refresh") && $grid.is(":visible")) {
								$grid.removeClass("pq-pending-refresh");
								grid.refresh()
							}
						}
					}
				}
				self.refreshComplete = true;
				return ret
			}
		},
		renderCell: function(ui) {
			var that = this.that,
				DTM = that.options.detailModel,
				hasChild = DTM.hasChild,
				cellData = ui.cellData,
				ret = "",
				rd = ui.rowData,
				hicon;
			if (rd.pq_gsummary || rd.pq_gtitle) {} else if (!hasChild || hasChild.call(that, rd)) {
				hicon = cellData && cellData.show ? DTM.expandIcon : DTM.collapseIcon;
				ret = "<div class='pq-icon-detail ui-icon " + hicon + "'></div>"
			}
			return ret
		},
		rowInvalidate: function(objP) {
			var that = this.that,
				rowData = that.getRowData(objP),
				dataIndx = "pq_detail",
				pq_detail = rowData[dataIndx],
				$temp = pq_detail ? pq_detail.child : null;
			if ($temp) {
				$temp.remove();
				rowData[dataIndx].child = null
			}
		},
		rowExpand: function(_objP) {
			var that = this.that,
				objP = that.normalize(_objP),
				o = that.options,
				rowData = objP.rowData,
				rip = objP.rowIndxPage,
				detM = o.detailModel,
				pq_detail, dataIndx = "pq_detail";
			if (rowData) {
				if (that._trigger("beforeRowExpand", null, objP) === false) {
					return
				}
				pq_detail = rowData[dataIndx] = rowData[dataIndx] || {};
				pq_detail.show = true;
				if (!detM.cache) {
					this.rowInvalidate(objP)
				}
				this.softRefresh([
					[rip, pq_detail.height || this.rowHtDetail]
				], objP)
			}
		},
		rowCollapse: function(_objP) {
			var that = this.that,
				o = that.options,
				objP = that.normalize(_objP),
				rowData = objP.rowData,
				rip = objP.rowIndxPage,
				detM = o.detailModel,
				di = "pq_detail",
				pq_detail = rowData ? rowData[di] : null;
			if (pq_detail && pq_detail.show) {
				objP.close = true;
				if (that._trigger("beforeRowExpand", null, objP) === false) {
					return
				}
				if (!detM.cache) {
					this.rowInvalidate(objP)
				}
				pq_detail.show = false;
				this.softRefresh([
					[rip, -(pq_detail.height || this.rowHtDetail)]
				], objP)
			}
		},
		softRefresh: function(arr, objP) {
			var that = this.that,
				iR = that.iRenderB;
			iR.initRowHtArrDetailSuper(arr);
			iR.setPanes();
			iR.setCellDims(true);
			objP && that.refreshRow(objP);
			iR.refresh()
		},
		onClick: function(evt, ui) {
			var column = ui.column,
				oe = evt.originalEvent,
				key = evt.keyCode,
				KC = $.ui.keyCode,
				etype = oe.type;
			if (column && column.type == this.type) {
				if (etype == "click" && $(oe.target).hasClass("ui-icon") || key == KC.ENTER || key == KC.SPACE) this[ui.rowData ? "toggle" : "toggleAll"](ui, evt)
			}
		},
		toggle: function(ui, evt) {
			var rowData = ui.rowData,
				rowIndx = ui.rowIndx;
			if (!rowData.pq_gtitle && !rowData.pq_gsummary) {
				this[(rowData.pq_detail || {}).show ? "rowCollapse" : "rowExpand"]({
					rowIndx: rowIndx
				})
			}
		},
		toggleAll: function() {
			var self = this,
				that = self.that,
				DTM = that.options.detailModel,
				hasChild = DTM.hasChild,
				show = !DTM.expandAll,
				arr = [],
				ht;
			that.pdata.forEach(function(rd, rip) {
				if (!hasChild || hasChild.call(that, rd, rip)) {
					var pq_detail = rd.pq_detail = rd.pq_detail || {};
					if (pq_detail.show != show) {
						pq_detail.show = show;
						ht = pq_detail.height || self.rowHtDetail;
						arr.push([rip, show ? ht : -1 * ht])
					}
				}
			});
			DTM.expandAll = show;
			self.softRefresh(arr);
			that.refresh()
		}
	}
})(jQuery);
(function($) {
	var cCells = function(that) {
		var self = this;
		self.that = that;
		self.class = "pq-grid-overlay";
		self.rtl = that.options.rtl ? "right" : "left";
		self.ranges = [];
		that.on("assignTblDims", self.onRefresh(self, that))
	};
	$.paramquery.cCells = cCells;
	cCells.prototype = {
		addBlock: function(range, remove) {
			if (!range || !this.addUnique(this.ranges, range)) {
				return
			}
			var that = this.that,
				o = that.options,
				r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				_cls = (o.noBorderSelection ? "pq-no-border " : "") + this.serialize(r1, c1, r2, c2),
				cls = _cls,
				clsN = _cls + " pq-number-overlay",
				clsH = _cls + " pq-head-overlay",
				iRender = that.iRenderB,
				gct = function(ri, ci) {
					return iRender.getCellCont(ri, ci)
				},
				tmp = this.shiftRC(r1, c1, r2, c2);
			if (!tmp) {
				return
			}
			r1 = tmp[0];
			c1 = tmp[1];
			r2 = tmp[2];
			c2 = tmp[3];
			var $contLT = gct(r1, c1),
				$contRB = gct(r2, c2),
				$contTR, $contBL, parLT_wd, parLT_ht, left, top, right, bottom, ht, wd;
			tmp = iRender.getCellXY(r1, c1);
			left = tmp[0];
			top = tmp[1];
			tmp = iRender.getCellCoords(r2, c2);
			right = tmp[2];
			bottom = tmp[3];
			ht = bottom - top, wd = right - left;
			var rangeStyle = range.style || "",
				border = x => "border-" + x + ":0;" + rangeStyle,
				borderTop0 = border("top"),
				borderRight0 = border("right"),
				borderBottom0 = border("bottom"),
				borderLeft0 = border("left");
			if ($contLT == $contRB) {
				this.addLayer(left, top, ht, wd, cls, $contLT, (wd ? "" : borderLeft0 + borderRight0) + (ht ? "" : borderTop0 + borderBottom0) + rangeStyle)
			} else {
				$contTR = gct(r1, c2);
				$contBL = gct(r2, c1);
				parLT_wd = $contLT[0].offsetWidth;
				parLT_ht = $contLT[0].offsetHeight;
				if ($contBL == $contLT) {
					this.addLayer(left, top, ht, parLT_wd - left, cls, $contLT, borderRight0);
					this.addLayer(0, top, ht, right, cls, $contRB, borderLeft0)
				} else if ($contLT == $contTR) {
					this.addLayer(left, top, parLT_ht - top, wd, cls, $contLT, borderBottom0);
					this.addLayer(left, 0, bottom, wd, cls, $contRB, borderTop0)
				} else {
					this.addLayer(left, top, parLT_ht - top, parLT_wd - left, cls, $contLT, borderRight0 + borderBottom0);
					this.addLayer(0, top, parLT_ht - top, right, cls, $contTR, borderBottom0 + borderLeft0);
					this.addLayer(left, 0, bottom, parLT_wd - left, cls, $contBL, borderTop0 + borderRight0);
					this.addLayer(0, 0, bottom, right, cls, $contRB, borderLeft0 + borderTop0)
				}
			}
			wd = o.numberCell.outerWidth || 0;
			this.addLayer(0, top, ht, wd, clsN, iRender.$clt, "");
			this.addLayer(0, top, ht, wd, clsN, iRender.$cleft, "");
			if (o.showHeader != false) {
				iRender = that.iRenderHead;
				tmp = iRender.getCellXY(0, c1);
				left = tmp[0];
				top = tmp[1];
				tmp = iRender.getCellCoords(that.headerCells.length - 1, c2);
				right = tmp[2];
				bottom = tmp[3];
				ht = bottom - top, wd = right - left;
				var $cont = iRender.$cright;
				this.addLayer(left, top, ht, wd, clsH, $cont, "");
				$cont = iRender.$cleft;
				this.addLayer(left, top, ht, wd, clsH, $cont, "")
			}
		},
		addLayer: function(left, top, ht, wd, cls, $cont, _style) {
			var style = this.rtl + ":" + left + "px;top:" + top + "px;height:" + ht + "px;width:" + wd + "px;" + (_style || "");
			$("<svg class='" + this.class + " " + cls + "' style='" + style + "'></svg>").appendTo($cont)
		},
		addUnique: function(ranges, range) {
			var found = ranges.filter(function(_range) {
				return range.r1 == _range.r1 && range.c1 == _range.c1 && range.r2 == _range.r2 && range.c2 == _range.c2
			})[0];
			if (!found) {
				ranges.push(range);
				return true
			}
		},
		getLastVisibleFrozenCI: function() {
			var that = this.that,
				CM = that.colModel,
				i = that.options.freezeCols - 1;
			for (; i >= 0; i--) {
				if (!CM[i].hidden) {
					return i
				}
			}
		},
		getLastVisibleFrozenRIP: function() {
			var that = this.that,
				data = that.get_p_data(),
				offset = that.riOffset,
				i = that.options.freezeRows + offset - 1;
			for (; i >= offset; i--) {
				if (!data[i].pq_hidden) {
					return i - offset
				}
			}
		},
		getSelection: function() {
			var that = this.that,
				data = that.get_p_data(),
				CM = that.colModel,
				cells = [];
			this.ranges.forEach(function(range) {
				var r1 = range.r1,
					r2 = range.r2,
					c1 = range.c1,
					c2 = range.c2,
					rd, i, j;
				for (i = r1; i <= r2; i++) {
					rd = data[i];
					for (j = c1; j <= c2; j++) {
						cells.push({
							dataIndx: CM[j].dataIndx,
							colIndx: j,
							rowIndx: i,
							rowData: rd
						})
					}
				}
			});
			return cells
		},
		isSelected: function(ui) {
			var that = this.that,
				objP = that.normalize(ui),
				ri = objP.rowIndx,
				ci = objP.colIndx;
			if (ci == null || ri == null) {
				return null
			}
			return !!this.ranges.find(function(range) {
				var r1 = range.r1,
					r2 = range.r2,
					c1 = range.c1,
					c2 = range.c2;
				if (ri >= r1 && ri <= r2 && ci >= c1 && ci <= c2) {
					return true
				}
			})
		},
		onRefresh: function(self, that) {
			var id;
			return function() {
				clearTimeout(id);
				id = setTimeout(function() {
					if (that.element) {
						self.removeAll();
						that.Selection().address().forEach(function(range) {
							self.addBlock(range)
						})
					}
				}, 50)
			}
		},
		removeAll: function() {
			var that = this.that,
				$cont = that.$cont;
			if ($cont) {
				$cont.children().children().children("svg").remove();
				that.$head_i.children().children("svg").remove()
			}
			this.ranges = []
		},
		removeBlock: function(range) {
			if (range) {
				var r1 = range.r1,
					c1 = range.c1,
					r2 = range.r2,
					c2 = range.c2,
					that = this.that,
					cls, indx = this.ranges.findIndex(function(_range) {
						return r1 == _range.r1 && c1 == _range.c1 && r2 == _range.r2 && c2 == _range.c2
					});
				if (indx >= 0) {
					this.ranges.splice(indx, 1);
					cls = "." + this.class + "." + this.serialize(r1, c1, r2, c2);
					that.$cont.find(cls).remove();
					that.$head_i.find(cls).remove()
				}
			}
		},
		serialize: function(r1, c1, r2, c2) {
			return "r1" + r1 + "c1" + c1 + "r2" + r2 + "c2" + c2
		},
		shiftRC: function(r1, c1, r2, c2) {
			var that = this.that,
				iM = that.iMerge,
				o = that.options,
				pdata_len = that.pdata.length,
				obj, fr = o.freezeRows,
				offset = that.riOffset;
			r1 -= offset;
			r2 -= offset;
			r1 = r1 < fr ? Math.max(r1, Math.min(0, r2)) : r1;
			if (r1 >= pdata_len || r2 < 0) {
				return
			} else {
				r2 = Math.min(r2, pdata_len - 1)
			}
			r1 += offset;
			r2 += offset;
			r1 -= offset;
			r2 -= offset;
			r1 = Math.max(r1, 0);
			r2 = Math.min(r2, pdata_len - 1);
			c2 = Math.min(c2, that.colModel.length - 1);
			return [r1, c1, r2, c2]
		}
	}
})(jQuery);
(function($) {
	$.paramquery.pqGrid.prototype.Range = function(range, expand) {
		return new pq.Range(this, range, "range", expand)
	};
	var Range = pq.Range = function(that, range, type, expand) {
		if (that == null) {
			throw "invalid param"
		}
		this.that = that;
		this._areas = [];
		if (this instanceof Range == false) {
			return new Range(that, range, type, expand)
		}
		this._type = type || "range";
		this.init(range, expand)
	};
	Range.prototype = $.extend({
		add: function(range) {
			this.init(range)
		},
		address: function() {
			return this._areas
		},
		addressLast: function() {
			var areas = this.address();
			return areas[areas.length - 1]
		},
		history: function(prop) {
			var oldS = {},
				newS = {},
				oldR = {},
				newR = {},
				rows = {},
				rowr = {},
				oldC = {},
				newC = {},
				cols = {},
				that = this.that,
				cellprop = "pq_cell" + prop,
				rowprop = "pq_row" + prop,
				undo = function(redo) {
					var fn = function(rowX, newX, oldX, prop) {
						for (var ri in rowX) {
							var key, dest = rowX[ri][prop],
								src = redo ? newX[ri] : oldX[ri];
							src = $.extend(true, {}, src);
							for (key in dest) {
								dest[key] = src[key]
							}
							for (key in src) {
								dest[key] = src[key]
							}
						}
					};
					fn(rows, newS, oldS, cellprop);
					fn(cols, newC, oldC, prop);
					fn(rowr, newR, oldR, rowprop);
					that.refresh()
				};
			return {
				add: function(rd, col, cell) {
					function a(rd, di, oldS, rows, prop) {
						var ri = rd[di];
						if (!oldS[ri]) {
							rows[ri] = rd;
							oldS[ri] = $.extend(true, {}, rd[prop])
						}
					}
					if (cell) {
						a(rd, "pq_ri", oldS, rows, cellprop)
					} else if (col) {
						a(col, "dataIndx", oldC, cols, prop)
					} else {
						a(rd, "pq_ri", oldR, rowr, rowprop)
					}
				},
				push: function() {
					function l(obj) {
						return Object.keys(obj).length
					}

					function a(rows, newS, prop) {
						for (var ri in rows) {
							newS[ri] = $.extend(true, {}, rows[ri][prop])
						}
					}
					if (l(rows) || l(cols) || l(rowr)) {
						a(rows, newS, cellprop);
						a(cols, newC, prop);
						a(rowr, newR, rowprop);
						that.iHistory.push({
							callback: undo
						})
					}
				}
			}
		},
		refreshStop: function() {
			this._stop = true
		},
		refresh: function() {
			this.that.refresh();
			this._stop = false
		},
		setAPS: function(key, val, str) {
			var self = this,
				that = self.that,
				typeRow, typeCol, cellstr = "pq_cell" + str,
				rowstr = "pq_row" + str,
				ca, typeAttr = str == "attr",
				h = self.history(str),
				a = function(rd, di, val, key) {
					if (val != null || rd[cellstr]) {
						ca = rd[cellstr] = rd[cellstr] || {};
						ca = ca[di] = ca[di] || {};
						if (ca[key] != val) {
							h.add(rd, null, true);
							ca[key] = val;
							if (key == "link" && rd[di] == null) {
								rd[di] = ""
							}
						}
					}
				};
			self.each(function(rd, di, col, type, ri, ci, r1, c1, r2, c2) {
				typeCol = type == "column";
				typeRow = type == "row";
				if ((typeCol || typeRow) && !typeAttr) {
					if (typeCol) {
						self.addProp(col);
						ca = col[str] = col[str] || {}
					} else {
						ca = rd[rowstr] = rd[rowstr] || {}
					}
					if (ca[key] != val) {
						if (typeCol) h.add(null, col);
						else h.add(rd);
						ca[key] = val
					}
					that.Range(typeCol ? {
						c1: ci,
						c2: ci
					} : {
						r1: ri,
						r2: ri
					}, false).each(function(rd, di) {
						var valO;
						if (typeCol) {
							if ((rd[rowstr] || {})[key] != null) {
								valO = val
							}
						}
						a(rd, di, valO, key)
					}, true)
				} else {
					if (key.indexOf("border") == 0) {
						self.setAPSBorder(key, val, ri, ci, r1, c1, r2, c2).forEach(function(_border) {
							a(rd, di, val, _border)
						})
					} else a(rd, di, val, key)
				}
			}, typeAttr);
			h.push();
			self._stop || self.refresh()
		},
		setAPSBorder: function(key, val, ri, ci, r1, c1, r2, c2) {
			var tmp = [],
				metVal = this.metaVal,
				outer = metVal == "outer",
				inner = metVal == "inner",
				topRow = ri == r1,
				bottomRow = ri == r2,
				leftCol = ci == c1,
				rightCol = ci == c2,
				b = "border-",
				bleft = b + "left",
				bright = b + "right",
				btop = b + "top",
				bbottom = b + "bottom",
				all = [btop, bbottom, bleft, bright, "border"];
			if (key == "border") {
				if (outer) {
					if (topRow || bottomRow) {
						tmp = [topRow ? btop : bbottom];
						if (leftCol || rightCol) tmp[1] = leftCol ? bleft : bright
					} else if (leftCol || rightCol) tmp = [leftCol ? bleft : bright]
				} else if (inner) {
					if (!rightCol) tmp = [bright];
					if (!bottomRow) tmp.push(bbottom)
				} else if (val) {
					tmp = [bright, bbottom];
					if (leftCol) tmp.push(bleft);
					if (topRow) tmp.push(btop)
				} else {
					tmp = all
				}
			} else if (key == bleft) {
				if (leftCol) tmp = [bleft]
			} else if (key == bright) {
				if (inner && !rightCol || !inner && rightCol) tmp = [bright]
			} else if (key == btop) {
				if (topRow) tmp = [btop]
			} else if (key == bbottom) {
				if (inner && !bottomRow || !inner && bottomRow) tmp = [bbottom]
			}
			return tmp
		},
		border: function(type, style, color) {
			var b = {
					all: "",
					outer: "",
					inner: "",
					none: "",
					vertical: "right",
					horizontal: "bottom"
				} [type],
				meta = {
					vertical: "inner",
					horizontal: "inner",
					outer: "outer",
					inner: "inner",
					all: "all"
				} [type];
			b = b == null ? type : b;
			this.style("border" + (b ? "-" + b : ""), type == "none" ? "" : style + " " + color, meta)
		},
		addProp: function(column) {
			column.prop = column.prop || {
				get align() {
					return column.align
				},
				set align(val) {
					column.align = val
				},
				get format() {
					return column.format
				},
				set format(val) {
					column.format = val
				},
				get valign() {
					return column.valign
				},
				set valign(val) {
					column.valign = val
				},
				get edit() {
					return column.editable
				},
				set edit(val) {
					column.editable = val
				}
			}
		},
		setAttr: function(str, val) {
			this.setAPS(str, val, "attr")
		},
		setStyle: function(str, val) {
			this.setAPS(str, val, "style")
		},
		setProp: function(str, val) {
			this.setAPS(str, val, "prop")
		},
		clear: function() {
			return this.copy({
				copy: false,
				cut: true,
				source: "clear"
			})
		},
		clearOther: function(_range) {
			var range = this._normal(_range, true),
				sareas = this.address(),
				i;
			for (i = sareas.length - 1; i >= 0; i--) {
				var srange = sareas[i];
				if (!(srange.r1 == range.r1 && srange.c1 == range.c1 && srange.r2 == range.r2 && srange.c2 == range.c2)) {
					sareas.splice(i, 1)
				}
			}
		},
		clone: function() {
			return this.that.Range(this._areas)
		},
		_cellAttr: function(rd, di) {
			var cellattr = rd.pq_cellattr = rd.pq_cellattr || {},
				ca = cellattr[di] = cellattr[di] || {};
			return ca
		},
		comment: function(text) {
			return this.attr("title", text)
		},
		link: function(text) {
			return this.prop("link", text)
		},
		pic: function(file, x, y) {
			var self = this,
				grid = self.that,
				P = grid.Pic(),
				ri = 0,
				ci = 0;
			self.each(function(rd, di, col, type, _ri, _ci) {
				ri = _ri;
				ci = _ci;
				return false
			});
			pq.fileToBase(file, function(src) {
				P.add(P.name(file.name), src, [ci, x || 0, ri, y || 0])
			})
		},
		_copyArea: function(r1, r2, c1, c2, CM, buffer, rowList, p_data, cut, copy, render, header, skippedRIs, skippedCIs) {
			var that = this.that,
				cv, cv2, str, ri, ci, di, column, dataType, readCell = that.readCell,
				getRenderVal = this.getRenderVal,
				iMerge = that.iMerge,
				stringType = [],
				colCopy = [],
				rowBuffer = [],
				offset = that.riOffset,
				iGV = that.iRenderB;
			for (ci = c1; ci <= c2; ci++) {
				column = CM[ci];
				dataType = column.dataType;
				stringType[ci] = !dataType || dataType == "string" || dataType == "html";
				if ((colCopy[ci] = column.copy) === false) {
					skippedCIs.push(ci);
					continue
				}
				if (header) rowBuffer.push(this.getTitle(column, ci))
			}
			if (header) buffer.push(rowBuffer.slice());
			for (ri = r1; ri <= r2; ri++) {
				var rd = p_data[ri];
				if (rd) {
					var newRow = {},
						oldRow = {},
						objR = {
							rowIndx: ri,
							rowIndxPage: ri - offset,
							rowData: rd,
							Export: true,
							exportClip: true
						};
					if (rd.pq_copy === false) {
						skippedRIs.push(ri);
						continue
					}
					rowBuffer = [];
					for (ci = c1; ci <= c2; ci++) {
						column = CM[ci];
						di = column.dataIndx;
						if (colCopy[ci] === false) {
							continue
						}
						cv = rd[di];
						if (copy) {
							cv2 = readCell(rd, column, iMerge, ri, ci);
							if (cv2 === cv) {
								objR.colIndx = ci;
								objR.column = column;
								objR.dataIndx = di;
								cv2 = getRenderVal(objR, render, iGV)[0];
								if (stringType[ci] && /(\r|\n)/.test(cv2)) {
									cv2 = this.newLine(cv2)
								}
							}
							rowBuffer.push(cv2)
						}
						if (cut && cv !== undefined) {
							newRow[di] = undefined;
							oldRow[di] = cv
						}
					}
					if (cut) {
						rowList.push({
							rowIndx: ri,
							rowData: rd,
							oldRow: oldRow,
							newRow: newRow
						})
					}
					buffer.push(rowBuffer.slice())
				}
			}
		},
		copy: function(ui) {
			ui = ui || {};
			var that = this.that,
				dest = ui.dest,
				cut = !!ui.cut,
				copy = ui.copy == null ? true : ui.copy,
				source = ui.source || (cut ? "cut" : "copy"),
				history = ui.history,
				allowInvalid = ui.allowInvalid,
				rowList = [],
				buffer = [],
				skippedRIs = [],
				skippedCIs = [],
				p_data = that.get_p_data(),
				CM = that.colModel,
				render = ui.render,
				header = ui.header,
				type, r1, c1, r2, c2, CPM = that.options.copyModel,
				clipboard = (navigator || {}).clipboard,
				areas = this.address(),
				evtUI = {
					areas: areas,
					cut: cut,
					dest: dest,
					header: header
				};
			history = history == null ? true : history;
			allowInvalid = allowInvalid == null ? true : allowInvalid;
			render = render == null ? CPM.render : render;
			header = header == null ? CPM.header : header;
			if (!areas.length) {
				return
			}
			if (that._trigger("beforeCopy", null, evtUI) === false) return;
			areas.forEach(function(area) {
				type = area.type, r1 = area.r1, c1 = area.c1, r2 = type === "cell" ? r1 : area.r2, c2 = type === "cell" ? c1 : area.c2;
				this._copyArea(r1, r2, c1, c2, CM, buffer, rowList, p_data, cut, copy, render, header, skippedRIs, skippedCIs)
			}, this);
			if (copy) {
				var $clip = ui.clip,
					str = buffer.map(function(rowBuffer) {
						return rowBuffer.join("\t") || " "
					}).join("\n");
				if ($clip) {
					$clip.val(str);
					$clip.select()
				} else {
					if (clipboard) {
						clipboard.writeText(str)
					}
					that._setGlobalStr(str)
				}
				evtUI.data = buffer;
				evtUI.skippedRIs = skippedRIs;
				evtUI.skippedCIs = skippedCIs;
				that._trigger("copy", null, evtUI)
			}
			if (dest) {
				that.paste({
					text: str,
					dest: dest,
					rowList: rowList,
					history: history,
					allowInvalid: allowInvalid
				})
			} else if (cut) {
				var ret = that._digestData({
					updateList: rowList,
					source: source,
					history: history,
					allowInvalid: allowInvalid
				});
				if (ret !== false) {
					that.refresh({
						source: source,
						header: false
					})
				}
			}
			return str
		},
		_countArea: function(nrange) {
			var arr = nrange,
				type = nrange.type,
				r1 = arr.r1,
				c1 = arr.c1,
				r2 = arr.r2,
				c2 = arr.c2;
			if (type === "cell") {
				return 1
			} else {
				return (r2 - r1 + 1) * (c2 - c1 + 1)
			}
		},
		count: function() {
			var type_range = this._type === "range",
				arr = this.address(),
				tot = 0,
				len = arr.length;
			for (var i = 0; i < len; i++) {
				tot += type_range ? this._countArea(arr[i]) : 1
			}
			return tot
		},
		cut: function(ui) {
			ui = ui || {};
			ui.cut = true;
			return this.copy(ui)
		},
		_eachRC: function(fn, data, r1, r2, expand) {
			var that = this.that,
				first = {
					r1: "getFirstVisibleRIP",
					c1: "getFirstVisibleCI"
				},
				last = {
					r1: "getLastVisibleRIP",
					c1: "getLastVisibleCI"
				};
			this.address().forEach(function(area) {
				var i = area[r1],
					c2 = area[r2];
				if (c2 == i && expand) {
					if (that[first[r1]]() == i) i = 0;
					if (that[last[r1]]() == c2) c2 = data.length - 1
				}
				for (; i <= c2; i++) {
					fn(data[i], i)
				}
			})
		},
		eachCol: function(fn, expand) {
			this._eachRC(fn, this.that.colModel, "c1", "c2", expand)
		},
		eachRow: function(fn, expand) {
			this._eachRC(fn, this.that.pdata, "r1", "r2", expand)
		},
		_hsCols: function(prop, expand) {
			var arr = [],
				obj = {};
			this.eachCol(function(col) {
				arr.push(col.dataIndx)
			}, expand);
			obj[prop] = arr;
			this.that.Columns().hide(obj)
		},
		hideCols: function() {
			this._hsCols("diHide")
		},
		showCols: function() {
			this._hsCols("diShow", true)
		},
		hideRows: function(show, expand) {
			this.eachRow(function(rd) {
				rd.pq_hidden = !show
			}, expand);
			this.that.refreshView()
		},
		showRows: function() {
			this.hideRows(true, true)
		},
		each: function(fn, all) {
			var that = this.that,
				CM = that.colModel,
				areas = this.address(),
				al = 0,
				data = that.pdata;
			for (; al < areas.length; al++) {
				var area = areas[al],
					r1 = area.r1,
					r2 = area.r2,
					c2 = area.c2,
					type = area.type,
					rd, j, c1, typeColumn = type == "column",
					typeRow = type == "row",
					i = r1,
					col;
				for (; i <= r2; i++) {
					rd = data[i];
					if (rd) {
						j = c1 = area.c1;
						j = j < 0 ? 0 : j;
						for (; j <= c2; j++) {
							col = CM[j];
							if (col && fn(rd, col.dataIndx, col, type, i, j, r1, c1, r2, c2) === false) return;
							if (typeRow && !all) break
						}
					}
					if (typeColumn && !all) break
				}
			}
		},
		enable: function(val) {
			val = this.prop("edit", val);
			return val == null ? true : val
		},
		getAPS: function(key, str) {
			var self = this,
				colstyle, ret, cellstyle, rowstyle;
			self.each(function(rd, di, col) {
				self.addProp(col);
				cellstyle = (rd["pq_cell" + str] || {})[di];
				cellstyle = (cellstyle || {})[key];
				rowstyle = (rd["pq_row" + str] || {})[key];
				colstyle = (col[str] || {})[key];
				ret = cellstyle == null ? rowstyle == null ? colstyle : rowstyle : cellstyle;
				return false
			});
			return ret
		},
		getAttr: function(key) {
			return this.getAPS(key, "attr")
		},
		getProp: function(key) {
			return this.getAPS(key, "prop")
		},
		getStyle: function(key) {
			return this.getAPS(key, "style")
		},
		getIndx: function(_indx) {
			return _indx == null ? this._areas.length - 1 : _indx
		},
		getValue: function() {
			var areas = this.address(),
				area, rd, alen = areas.length,
				arr = [],
				val, that = this.that,
				r1, c1, r2, c2, i, j, k = 0,
				data;
			if (alen) {
				data = that.get_p_data();
				for (; k < alen; k++) {
					area = areas[k];
					r1 = area.r1;
					c1 = area.c1;
					r2 = area.r2;
					c2 = area.c2;
					for (i = r1; i <= r2; i++) {
						rd = data[i];
						for (j = c1; j <= c2; j++) {
							val = rd[that.colModel[j].dataIndx];
							arr.push(val)
						}
					}
				}
			}
			return arr
		},
		indexOf: function(range) {
			range = this._normal(range);
			var r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				areas = this.address(),
				i = 0,
				len = areas.length,
				a;
			for (; i < len; i++) {
				a = areas[i];
				if (r1 >= a.r1 && r2 <= a.r2 && c1 >= a.c1 && c2 <= a.c2) {
					return i
				}
			}
			return -1
		},
		index: function(range) {
			range = this._normal(range);
			var type = range.type,
				r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				areas = this.address(),
				i = 0,
				len = areas.length,
				a;
			for (; i < len; i++) {
				a = areas[i];
				if (type === a.type && r1 === a.r1 && r2 === a.r2 && c1 === a.c1 && c2 === a.c2) {
					return i
				}
			}
			return -1
		},
		init: function(range, expand) {
			var self = this;
			expand = expand !== false;
			if (range) {
				if (pq.isFn(range.push)) {
					for (var i = 0, len = range.length; i < len; i++) {
						this.init(range[i], expand)
					}
				} else if (pq.isStr(range)) {
					range.split(",").forEach(function(_r) {
						self.init(pq.getAddress(_r), expand)
					})
				} else {
					var nrange = this._normal(range, expand),
						areas = this._areas = this._areas || [];
					if (nrange) {
						areas.push(nrange)
					}
				}
			}
		},
		isValid: function() {
			var areas = this._areas;
			return !!areas.length
		},
		freezePanes: function() {
			var area = this._areas[0];
			if (area) {
				var c1 = area.c1,
					r1 = area.r1,
					grid = this.that,
					o = grid.options;
				o.freezeRows = r1;
				o.freezeCols = c1;
				grid.refresh();
				return true
			}
		},
		format: function(val) {
			return this.prop("format", val)
		},
		addCol: function(right, col) {
			var area = this._areas[0],
				c1 = area.c1,
				c2 = area.c2,
				cols = [],
				i = c1;
			for (; i <= c2; i++) {
				cols.push($.extend({
					dataIndx: Math.random(),
					width: 100
				}, col))
			}
			this.that.Columns().add(cols, right ? c2 + 1 : c1, null, "addCols")
		},
		deleteCol: function() {
			var area = this._areas[0],
				c1 = area.c1,
				c2 = area.c2;
			this.that.Columns().remove(c2 - c1 + 1, c1)
		},
		addRow: function(below, row) {
			var area = this._areas[0],
				r1 = area.r1,
				r2 = area.r2,
				rows = [],
				i = r1;
			for (; i <= r2; i++) {
				rows.push($.extend({}, row))
			}
			this.that.addNodes(rows, below ? r2 + 1 : r1, null, "addRows")
		},
		deleteRow: function() {
			var area = this._areas[0],
				that = this.that,
				r1 = area.r1,
				rows = that.pageData().slice(r1, area.r2 + 1);
			that.deleteNodes(rows)
		},
		merge: function(ui) {
			ui = ui || {};
			var that = this.that,
				o = that.options,
				mc = o.mergeCells,
				areas = this._areas,
				rc, cc, area = areas[0];
			if (area) {
				rc = area.r2 - area.r1 + 1;
				cc = area.c2 - area.c1 + 1;
				if (rc > 1 || cc > 1) {
					area.rc = rc;
					area.cc = cc;
					mc.push(area);
					if (ui.refresh !== false) {
						that.refreshView()
					}
				}
			}
		},
		newLine: function(cv) {
			return '"' + cv.replace(/"/g, '""') + '"'
		},
		replace: function(_range, _indx) {
			var range = this._normal(_range),
				sareas = this._areas,
				indx = this.getIndx(_indx);
			sareas.splice(indx, 1, range)
		},
		remove: function(range) {
			var areas = this._areas,
				indx = this.indexOf(range);
			if (indx >= 0) {
				areas.splice(indx, 1)
			}
		},
		resize: function(_range, _indx) {
			var range = this._normal(_range),
				sareas = this._areas,
				indx = this.getIndx(_indx),
				sarea = sareas[indx];
			["r1", "c1", "r2", "c2", "rc", "cc", "type"].forEach(function(key) {
				sarea[key] = range[key]
			});
			return this
		},
		_RC1: function(r1orc1) {
			return Math.min(...this._areas.map(area => area[r1orc1]))
		},
		R1: function() {
			return this._RC1("r1")
		},
		C1: function() {
			return this._RC1("c1")
		},
		rows: function(indx) {
			var that = this.that,
				narr = [],
				arr = this.addressLast();
			if (arr) {
				var r1 = arr.r1,
					c1 = arr.c1,
					r2 = arr.r2,
					c2 = arr.c2,
					type = arr.type,
					indx1 = indx == null ? r1 : r1 + indx,
					indx2 = indx == null ? r2 : r1 + indx;
				for (var i = indx1; i <= indx2; i++) {
					narr.push({
						r1: i,
						c1: c1,
						r2: i,
						c2: c2,
						type: type
					})
				}
			}
			return pq.Range(that, narr, "row")
		},
		cols: function(indx) {
			var that = this.that,
				narr = [],
				arr = this._areas[0];
			if (arr) {
				var r1 = arr.r1,
					c1 = arr.c1,
					r2 = arr.r2,
					c2 = arr.c2;
				for (var i = c1; i <= c2; i++) {
					narr.push({
						r1: r1,
						c1: i,
						r2: r2,
						c2: i
					})
				}
			}
			return pq.Range(that, narr, "column")
		},
		cells: function() {
			var that = this.that,
				narr = [];
			this._areas.forEach(arr => {
				var r1 = arr.r1,
					c1 = arr.c1,
					r2 = arr.r2,
					c2 = arr.c2;
				for (var ri = r1; ri <= r2; ri++) {
					for (var ci = c1; ci <= c2; ci++) {
						narr.push({
							r1: ri,
							c1: ci,
							r2: ri,
							c2: ci
						})
					}
				}
			});
			return pq.Range(that, narr, "cell")
		},
		_normal: function(range, expand) {
			if (range.type) {
				return range
			}
			var arr;
			if (pq.isFn(range.push)) {
				arr = [];
				for (var i = 0, len = range.length; i < len; i++) {
					var ret = this._normal(range[i], expand);
					if (ret) {
						arr.push(ret)
					}
				}
				return arr
			}
			var that = this.that,
				data = that.get_p_data(),
				rmax = data.length - 1,
				CM = that.colModel,
				cmax = CM.length - 1,
				r1 = range.r1,
				c1 = range.c1,
				r1 = r1 > rmax ? rmax : r1,
				c1 = c1 > cmax ? cmax : c1,
				rc = range.rc,
				cc = range.cc,
				r2 = range.r2,
				c2 = range.c2,
				tmp, type;
			if (cmax < 0 || rmax < 0) {
				return null
			}
			if (r1 == null && c1 == null) {
				return
			}
			if (r1 > r2) {
				tmp = r1;
				r1 = r2;
				r2 = tmp
			}
			if (c1 > c2) {
				tmp = c1;
				c1 = c2;
				c2 = tmp
			}
			if (r1 == null) {
				r1 = 0;
				r2 = rmax;
				c2 = c2 == null ? c1 : c2;
				type = "column"
			} else if (c1 == null) {
				if (!range._type) {}
				c1 = 0;
				r2 = r2 == null ? r1 : r2;
				c2 = cmax;
				type = range._type || "row"
			} else if (r2 == null && rc == null || r1 == r2 && c1 == c2) {
				type = "cell";
				r2 = r1;
				c2 = c1
			} else {
				type = "block"
			}
			r2 = rc ? r1 + rc - 1 : r2;
			c2 = cc ? c1 + cc - 1 : c2;
			r2 = r2 > rmax ? rmax : r2;
			c2 = c2 > cmax ? cmax : c2;
			if (expand && (type == "block" || type == "cell")) {
				arr = that.iMerge.inflateRange(r1, c1, r2, c2);
				r1 = arr[0];
				c1 = arr[1];
				r2 = arr[2];
				c2 = arr[3]
			}
			rc = r2 - r1 + 1;
			cc = c2 - c1 + 1;
			range.r1 = r1;
			range.c1 = c1;
			range.r2 = r2;
			range.c2 = c2;
			range.rc = rc;
			range.cc = cc;
			range.type = range.type || type;
			return range
		},
		select: function() {
			var that = this.that,
				iS = that.iSelection,
				areas = this._areas;
			if (areas.length) {
				iS.removeAll({
					trigger: false
				});
				areas.forEach(function(area) {
					iS.add(area, false)
				});
				iS.trigger()
			}
			return this
		},
		style: function(key, val, metaVal) {
			this.metaVal = metaVal;
			return this._prop(key, val, "Style")
		},
		_prop: function(key, val, str) {
			return this[(val != null ? "set" : "get") + str](key, val)
		},
		attr: function(key, val) {
			return this._prop(key, val, "Attr")
		},
		prop: function(key, val) {
			return this._prop(key, val, "Prop")
		},
		toggleStyle: function(key, arr) {
			var val = this.getStyle(key),
				val2 = !val || val == arr[1] ? arr[0] : arr[1];
			this.style(key, val2)
		},
		unmerge: function(ui) {
			ui = ui || {};
			var that = this.that,
				o = that.options,
				mc = o.mergeCells,
				areas = this._areas,
				area = areas[0];
			if (area) {
				for (var i = 0; i < mc.length; i++) {
					var mcRec = mc[i];
					if (mcRec.r1 === area.r1 && mcRec.c1 === area.c1) {
						mc.splice(i, 1);
						break
					}
				}
				if (ui.refresh !== false) {
					that.refreshView()
				}
			}
		},
		align: function(val) {
			return this.prop("align", val)
		},
		valign: function(val) {
			return this.prop("valign", val)
		},
		value: function(val) {
			var ii = 0,
				that = this.that,
				CM = that.colModel,
				area, r1, c1, r2, c2, rowList = [],
				areas = this.address();
			if (val === undefined) {
				return this.getValue()
			}
			for (var i = 0; i < areas.length; i++) {
				area = areas[i];
				r1 = area.r1;
				c1 = area.c1;
				r2 = area.r2;
				c2 = area.c2;
				for (var j = r1; j <= r2; j++) {
					var obj = that.normalize({
							rowIndx: j
						}),
						rd = obj.rowData,
						ri = obj.rowIndx,
						oldRow = {},
						newRow = {};
					for (var k = c1; k <= c2; k++) {
						var dataIndx = CM[k].dataIndx;
						newRow[dataIndx] = val[ii++];
						oldRow[dataIndx] = rd[dataIndx]
					}
					rowList.push({
						rowData: rd,
						rowIndx: ri,
						newRow: newRow,
						oldRow: oldRow
					})
				}
			}
			if (rowList.length) {
				that._digestData({
					updateList: rowList,
					source: "range"
				});
				that.refresh({
					header: false
				})
			}
			return this
		},
		val2D: function() {
			var D2 = [],
				grid = this.that,
				obj = {},
				key;
			this._areas.forEach(function(a) {
				var c1 = a.c1,
					c2 = a.c2,
					ri = a.r1,
					val;
				for (; ri <= a.r2; ri++) {
					val = grid.Range({
						r1: ri,
						rc: 1,
						c1: c1,
						c2: c2
					}).value();
					obj[ri] = obj[ri] ? obj[ri].concat(val) : val
				}
			});
			for (key in obj) {
				D2.push(obj[key])
			}
			return D2
		},
		toString: function() {
			var toLetter = pq.toLetter,
				cell;
			return this._areas.map(a => {
				cell = toLetter(a.c1) + (a.r1 + 1);
				return a.type == "cell" ? cell : cell + ":" + toLetter(a.c2) + (a.r2 + 1)
			}).join(",")
		}
	}, pq.mixin.render);

	function selectEndDelegate(evt) {
		if (!evt.shiftKey || evt.type == "pqGrid:mousePQUp") {
			this._trigger("selectEnd", null, {
				selection: this.Selection()
			});
			this.off("mousePQUp", selectEndDelegate);
			this.off("keyUp", selectEndDelegate)
		}
	}
	var Selection = pq.Selection = function(that, range) {
		if (that == null) {
			throw "invalid param"
		}
		if (this instanceof Selection == false) {
			return new Selection(that, range)
		}
		this._areas = [];
		this.that = that;
		this.iCells = new $.paramquery.cCells(that);
		this._base(that, range)
	};
	pq.inherit(Range, Selection, {
		add: function(range, trigger) {
			var narea = this._normal(range, true),
				iC = this.iCells,
				indx = this.indexOf(narea);
			if (indx >= 0) {
				return
			}
			iC.addBlock(narea);
			this._super(narea);
			if (trigger !== false) {
				this.trigger()
			}
		},
		clearOther: function(_range, noTrigger) {
			var iCells = this.iCells,
				range = this._normal(_range, true);
			this.address().forEach(function(srange) {
				if (!(srange.r1 == range.r1 && srange.c1 == range.c1 && srange.r2 == range.r2 && srange.c2 == range.c2)) {
					iCells.removeBlock(srange)
				}
			});
			this._super(range);
			noTrigger || this.trigger()
		},
		getSelection: function() {
			return this.iCells.getSelection()
		},
		isSelected: function(ui) {
			return this.iCells.isSelected(ui)
		},
		removeAll: function(ui) {
			ui = ui || {};
			if (this._areas.length) {
				this.iCells.removeAll();
				this._areas = [];
				if (ui.trigger !== false) {
					this.trigger()
				}
			}
		},
		resizeOrReplace: function(range, indx) {
			this.resize(range, indx) || this.replace(range, indx)
		},
		replace: function(_range, _indx) {
			var iCells = this.iCells,
				range = this._normal(_range),
				sareas = this._areas,
				indx = this.getIndx(_indx),
				srange = sareas[indx];
			iCells.removeBlock(srange);
			iCells.addBlock(range);
			this._super(range, indx);
			this.trigger()
		},
		resize: function(_range, _indx) {
			var range = this._normal(_range, true),
				r1 = range.r1,
				c1 = range.c1,
				r2 = range.r2,
				c2 = range.c2,
				sareas = this._areas || [];
			if (!sareas.length) {
				return false
			}
			var indx = this.getIndx(_indx),
				srange = sareas[indx],
				sr1 = srange.r1,
				sc1 = srange.c1,
				sr2 = srange.r2,
				sc2 = srange.c2,
				topLeft = sr1 === r1 && sc1 === c1,
				topRight = sr1 === r1 && sc2 === c2,
				bottomLeft = sr2 === r2 && sc1 === c1,
				bottomRight = sr2 === r2 && sc2 === c2;
			if (topLeft && topRight && bottomLeft && bottomRight) {
				return true
			}
		},
		selectAll: function(ui) {
			ui = ui || {};
			var type = ui.type,
				that = this.that,
				CM = that.colModel,
				all = ui.all,
				r1 = all ? 0 : that.riOffset,
				data_len = all ? that.get_p_data().length : that.pdata.length,
				cm_len = CM.length - 1,
				range, r2 = r1 + data_len - 1;
			if (type === "row") {
				range = {
					r1: r1,
					r2: r2
				}
			} else {
				range = {
					c1: 0,
					c2: cm_len,
					_type: "column",
					r1: 0,
					r2: r2
				}
			}
			that.Range(range).select();
			return this
		},
		trigger: function() {
			var that = this.that;
			that._trigger("selectChange", null, {
				selection: this
			});
			that.off("mousePQUp", selectEndDelegate);
			that.off("keyUp", selectEndDelegate);
			that.on("mousePQUp", selectEndDelegate);
			that.on("keyUp", selectEndDelegate)
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$.widget("paramquery.pqToolbar", {
		options: {
			items: [],
			gridInstance: null,
			events: {
				button: "click",
				select: "change",
				checkbox: "change",
				textbox: "change",
				color: "change",
				textarea: "change",
				file: "change"
			}
		},
		_create: function() {
			var o = this.options,
				that = o.gridInstance,
				events = o.events,
				event, listener, bootstrap = o.bootstrap,
				BS_on = bootstrap.on,
				CM = that.colModel,
				timeout = that.options.filterModel.timeout,
				items = o.items,
				element = this.element,
				i = 0,
				len = items.length;
			element.addClass("pq-toolbar");
			for (; i < len; i++) {
				var item = items[i],
					type = item.type,
					ivalue = item.value,
					icon = item.icon,
					options = item.options = item.options || {},
					label = item.label,
					init = item.init,
					listener = item.listener,
					listeners = listener ? [listener] : item.listeners,
					listeners = listeners || [function() {}],
					itemcls = item.cls,
					cls = itemcls ? itemcls : "",
					cls = cls ? "class='" + cls + "'" : "",
					itemstyle = item.style,
					style = itemstyle ? "style='" + itemstyle + "'" : "",
					styleCtrl = item.styleCtrl ? "style='" + item.styleCtrl + "'" : "",
					attr = item.attr || "",
					labelOpen = label ? "<label " + style + ">" + label : "",
					labelClose = label ? "</label>" : "",
					strStyleClsAttr = label && type != "button" && type != "file" ? [cls, attr, styleCtrl] : [cls, attr, style || styleCtrl],
					strStyleClsAttr = strStyleClsAttr.join(" "),
					inp, $ctrl, $ctrlInner;
				if (type == "textbox" || type == "color") {
					$ctrl = $([labelOpen, "<input type=" + (type == "color" ? type : "text") + " " + strStyleClsAttr + ">", labelClose].join(""))
				} else if (type == "textarea") {
					$ctrl = $([labelOpen, "<textarea " + strStyleClsAttr + "></textarea>", labelClose].join(""))
				} else if (type == "select") {
					if (pq.isFn(options)) {
						options = options.call(that, {
							colModel: CM
						})
					}
					options = options || [];
					inp = _pq.select({
						options: options,
						attr: strStyleClsAttr,
						prepend: item.prepend,
						groupIndx: item.groupIndx,
						valueIndx: item.valueIndx,
						labelIndx: item.labelIndx
					});
					$ctrl = $([labelOpen, inp, labelClose].join(""))
				} else if (type == "file") {
					cls = icon && label ? "ui-button-text-icon-primary" : icon ? "ui-button-icon-only" : "ui-button-text-only";
					$ctrl = $(["<label class='ui-button ui-widget ui-state-default ui-corner-all " + cls + "' " + attr + " " + style + ">", "<input type='file' style='display:none;' " + (item.attrFile || "") + ">", icon ? "<span class='ui-button-icon-primary ui-icon " + icon + "'></span>" : "", "<span class='ui-button-text'>" + (label || "") + "</span>", "</label>"].join(""))
				} else if (type == "checkbox") {
					$ctrl = $([label ? "<label " + style + ">" : "", "<input type='checkbox' ", ivalue ? "checked='checked' " : "", strStyleClsAttr, ">", label ? label + "</label>" : ""].join(""))
				} else if (type == "separator") {
					$ctrl = $("<span class='pq-separator' " + [attr, style].join(" ") + "></span>")
				} else if (type == "button") {
					$ctrl = $("<button type='button' " + strStyleClsAttr + ">" + label + "</button>");
					$ctrl.button($.extend({
						label: label || "",
						showLabel: !!label,
						text: !!label,
						icon: icon,
						icons: {
							primary: BS_on ? "" : icon
						}
					}, options))
				} else if (pq.isStr(type)) {
					$ctrl = $(type)
				} else if (pq.isFn(type)) {
					inp = type.call(that, {
						colModel: CM,
						cls: cls
					});
					$ctrl = $(inp)
				}
				$ctrl.appendTo(element);
				init && init.call(that, $ctrl[0]);
				$ctrlInner = this.getInner($ctrl, label, type);
				if (type !== "checkbox" && ivalue !== undefined) {
					$ctrlInner.val(ivalue)
				}
				for (var j = 0, lenj = listeners.length; j < lenj; j++) {
					listener = listeners[j];
					var _obj = {};
					if (typeof listener == "function") {
						_obj[events[type]] = listener
					} else {
						_obj = listener
					}
					for (event in _obj) {
						pq.fakeEvent($ctrlInner, event, timeout);
						$ctrlInner.on(event, this._onEvent(that, _obj[event], item))
					}
				}
			}
		}
	});
	$.extend(_pq.pqToolbar.prototype, {
		getInner: function($ctrl, label, type) {
			var ctrl = $ctrl[0];
			return ctrl.nodeName.toUpperCase() == "LABEL" ? $($ctrl.children("input,select,textarea")) : $ctrl
		},
		refresh: function() {
			this.element.empty();
			this._create()
		},
		_onEvent: function(that, cb, item) {
			return function(evt) {
				var type = item.type;
				if (type == "checkbox") {
					item.value = $(evt.target).prop("checked")
				} else {
					item.value = $(evt.target).val()
				}
				cb.call(that, evt);
				if (type == "file") {
					$(this).val("")
				}
			}
		},
		_destroy: function() {
			this.element.empty().removeClass("pq-toolbar").enableSelection()
		},
		_disable: function() {
			if (this.$disable == null) this.$disable = $("<div class='pq-grid-disable'></div>").css("opacity", .2).appendTo(this.element)
		},
		_enable: function() {
			if (this.$disable) {
				this.element[0].removeChild(this.$disable[0]);
				this.$disable = null
			}
		},
		_setOption: function(key, value) {
			if (key == "disabled") {
				if (value == true) {
					this._disable()
				} else {
					this._enable()
				}
			}
		}
	});
	pq.toolbar = function(selector, options) {
		var $p = $(selector).pqToolbar(options),
			p = $p.data("paramqueryPqToolbar") || $p.data("paramquery-pqToolbar");
		return p
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fnGrid = _pq.pqGrid.prototype;
	fnGrid.options.trackModel = {
		on: false,
		dirtyClass: "pq-cell-dirty"
	};
	_pq.cUCData = function(that) {
		this.that = that;
		this.udata = [];
		this.ddata = [];
		this.adata = [];
		this.options = that.options;
		that.on("dataAvailable", this.onDA(this))
	};
	_pq.cUCData.prototype = {
		add: function(obj) {
			var that = this.that,
				adata = this.adata,
				ddata = this.ddata,
				rowData = obj.rowData,
				TM = this.options.trackModel,
				dirtyClass = TM.dirtyClass,
				recId = that.getRecId({
					rowData: rowData
				});
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i];
				if (recId != null && rec.recId == recId) {
					throw "primary key violation"
				}
				if (rec.rowData == rowData) {
					throw "same data can't be added twice."
				}
			}
			for (var i = 0, len = ddata.length; i < len; i++) {
				if (rowData == ddata[i].rowData) {
					ddata.splice(i, 1);
					return
				}
			}
			var dataIndxs = [];
			for (var dataIndx in rowData) {
				dataIndxs.push(dataIndx)
			}
			that.removeClass({
				rowData: rowData,
				dataIndx: dataIndxs,
				cls: dirtyClass
			});
			var obj = {
				recId: recId,
				rowData: rowData
			};
			adata.push(obj)
		},
		commit: function(objP) {
			var that = this.that;
			if (objP == null) {
				this.commitAddAll();
				this.commitUpdateAll();
				this.commitDeleteAll()
			} else {
				var history = objP.history,
					options = that.options,
					TM = options.treeModel,
					DM = options.dataModel,
					updateList = [],
					recIndx = DM.recIndx,
					objType = objP.type,
					rows = objP.rows;
				history = history == null ? false : history;
				if (objType == "add") {
					if (rows) updateList = this.commitAdd(rows, recIndx);
					else {
						this.commitAddAll()
					}
				} else if (objType == "update") {
					if (rows) this.commitUpdate(rows, recIndx);
					else {
						this.commitUpdateAll()
					}
				} else if (objType == "delete") {
					if (rows) this.commitDelete(rows, recIndx);
					else {
						this.commitDeleteAll()
					}
				}
				if (updateList.length) {
					that._digestData({
						source: "commit",
						checkEditable: false,
						track: false,
						history: history,
						updateList: updateList
					});
					that.refreshView({
						header: false
					})
				}
			}
		},
		commitAdd: function(rows, recIndx) {
			var that = this.that,
				i, j, k, rowData, row, CM = that.colModel,
				CMLength = CM.length,
				adata = this.adata,
				inArray = $.inArray,
				TM = that.options.treeModel,
				isTree = TM.dataIndx != null,
				parentId = TM.parentId,
				adataLen = adata.length,
				getVal = that.getValueFromDataType,
				updateList = [],
				rowLen = rows.length,
				_found, foundRowData = [];
			for (j = 0; j < rowLen; j++) {
				row = rows[j];
				for (i = 0; i < adataLen; i++) {
					rowData = adata[i].rowData;
					_found = true;
					if (inArray(rowData, foundRowData) == -1) {
						for (k = 0; k < CMLength; k++) {
							var column = CM[k],
								dataType = column.dataType,
								dataIndx = column.dataIndx;
							if (column.hidden || dataIndx == recIndx || isTree && dataIndx == parentId) {
								continue
							}
							var cellData = rowData[dataIndx],
								cellData = getVal(cellData, dataType),
								cell = row[dataIndx],
								cell = getVal(cell, dataType);
							if (cellData !== cell) {
								_found = false;
								break
							}
						}
						if (_found) {
							var newRow = {},
								oldRow = {},
								fn = function(_indx) {
									newRow[_indx] = row[_indx];
									oldRow[_indx] = rowData[_indx]
								};
							fn(recIndx);
							if (isTree) fn(parentId);
							updateList.push({
								rowData: rowData,
								oldRow: oldRow,
								newRow: newRow
							});
							foundRowData.push(rowData);
							break
						}
					}
				}
			}
			var remain_adata = [];
			for (i = 0; i < adataLen; i++) {
				rowData = adata[i].rowData;
				if (inArray(rowData, foundRowData) == -1) {
					remain_adata.push(adata[i])
				}
			}
			this.adata = remain_adata;
			return updateList
		},
		commitDelete: function(rows, recIndx) {
			var ddata = this.ddata,
				i = ddata.length,
				udata = this.udata,
				rowData, recId, j, k;
			while (i--) {
				rowData = ddata[i].rowData;
				recId = rowData[recIndx];
				j = rows.length;
				if (!j) {
					break
				}
				while (j--) {
					if (recId == rows[j][recIndx]) {
						rows.splice(j, 1);
						ddata.splice(i, 1);
						k = udata.length;
						while (k--) {
							if (udata[k].rowData == rowData) {
								udata.splice(k, 1)
							}
						}
						break
					}
				}
			}
		},
		commitUpdate: function(rows, recIndx) {
			var that = this.that,
				i, j, dirtyClass = this.options.trackModel.dirtyClass,
				udata = this.udata,
				udataLen = udata.length,
				rowLen = rows.length,
				foundRowData = [];
			for (i = 0; i < udataLen; i++) {
				var rec = udata[i],
					rowData = rec.rowData,
					oldRow = rec.oldRow;
				if ($.inArray(rowData, foundRowData) != -1) {
					continue
				}
				for (j = 0; j < rowLen; j++) {
					var row = rows[j];
					if (rowData[recIndx] == row[recIndx]) {
						foundRowData.push(rowData);
						for (var dataIndx in oldRow) {
							that.removeClass({
								rowData: rowData,
								dataIndx: dataIndx,
								cls: dirtyClass
							})
						}
					}
				}
			}
			var newudata = [];
			for (i = 0; i < udataLen; i++) {
				rowData = udata[i].rowData;
				if ($.inArray(rowData, foundRowData) == -1) {
					newudata.push(udata[i])
				}
			}
			this.udata = newudata
		},
		commitAddAll: function() {
			this.adata = []
		},
		commitDeleteAll: function() {
			var ddata = this.ddata,
				udata = this.udata,
				j = udata.length,
				rowData, ddataLen = ddata.length;
			for (var i = 0; j > 0 && i < ddataLen; i++) {
				rowData = ddata[i].rowData;
				while (j--) {
					if (udata[j].rowData == rowData) {
						udata.splice(j, 1)
					}
				}
				j = udata.length
			}
			ddata.length = 0
		},
		commitUpdateAll: function() {
			var that = this.that,
				dirtyClass = this.options.trackModel.dirtyClass,
				udata = this.udata;
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					row = rec.oldRow,
					rowData = rec.rowData;
				for (var dataIndx in row) {
					that.removeClass({
						rowData: rowData,
						dataIndx: dataIndx,
						cls: dirtyClass
					})
				}
			}
			this.udata = []
		},
		delete: function(obj) {
			var that = this.that,
				rowIndx = obj.rowIndx,
				rowIndxPage = obj.rowIndxPage,
				offset = that.riOffset,
				rowIndx = rowIndx == null ? rowIndxPage + offset : rowIndx,
				rowIndxPage = rowIndxPage == null ? rowIndx - offset : rowIndxPage,
				paging = that.options.pageModel.type,
				indx = paging == "remote" ? rowIndxPage : rowIndx,
				adata = this.adata,
				ddata = this.ddata,
				rowData = that.getRowData(obj);
			for (var i = 0, len = adata.length; i < len; i++) {
				if (adata[i].rowData == rowData) {
					adata.splice(i, 1);
					return
				}
			}
			ddata.push({
				indx: indx,
				rowData: rowData,
				rowIndx: rowIndx
			})
		},
		getChangesValue: function(ui) {
			ui = ui || {};
			var that = this.that,
				all = ui.all,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				mupdateList = [],
				updateList = [],
				oldList = [],
				addList = [],
				mdeleteList = [],
				deleteList = [];
			for (var i = 0, len = ddata.length; i < len; i++) {
				var rec = ddata[i],
					rowData = rec.rowData,
					row = {};
				mdeleteList.push(rowData);
				for (var key in rowData) {
					if (key.indexOf("pq_") != 0) {
						row[key] = rowData[key]
					}
				}
				deleteList.push(row)
			}
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					oldRow = rec.oldRow,
					rowData = rec.rowData;
				if ($.inArray(rowData, mdeleteList) != -1) {
					continue
				}
				if ($.inArray(rowData, mupdateList) == -1) {
					var row = {};
					if (all !== false) {
						for (var key in rowData) {
							if (key.indexOf("pq_") != 0) {
								row[key] = rowData[key]
							}
						}
					} else {
						for (var key in oldRow) {
							row[key] = rowData[key]
						}
						row[that.options.dataModel.recIndx] = rec.recId
					}
					mupdateList.push(rowData);
					updateList.push(row);
					oldList.push(oldRow)
				}
			}
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i],
					rowData = rec.rowData,
					row = {};
				for (var key in rowData) {
					if (key.indexOf("pq_") != 0) {
						row[key] = rowData[key]
					}
				}
				addList.push(row)
			}
			return {
				updateList: updateList,
				addList: addList,
				deleteList: deleteList,
				oldList: oldList
			}
		},
		getChanges: function() {
			var that = this.that,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				inArray = $.inArray,
				updateList = [],
				oldList = [],
				addList = [],
				deleteList = [];
			for (var i = 0, len = ddata.length; i < len; i++) {
				var rec = ddata[i],
					rowData = rec.rowData;
				deleteList.push(rowData)
			}
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					oldRow = rec.oldRow,
					rowData = rec.rowData;
				if (inArray(rowData, deleteList) != -1) {
					continue
				}
				if (inArray(rowData, updateList) == -1) {
					updateList.push(rowData);
					oldList.push(oldRow)
				}
			}
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i],
					rowData = rec.rowData;
				addList.push(rowData)
			}
			return {
				updateList: updateList,
				addList: addList,
				deleteList: deleteList,
				oldList: oldList
			}
		},
		getChangesRaw: function() {
			var that = this.that,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				mydata = {
					updateList: [],
					addList: [],
					deleteList: []
				};
			mydata["updateList"] = udata;
			mydata["addList"] = adata;
			mydata["deleteList"] = ddata;
			return mydata
		},
		isDirty: function(ui) {
			var that = this.that,
				udata = this.udata,
				adata = this.adata,
				ddata = this.ddata,
				dirty = false,
				rowData = that.getRowData(ui);
			if (rowData) {
				for (var i = 0; i < udata.length; i++) {
					var rec = udata[i];
					if (rowData == rec.rowData) {
						dirty = true;
						break
					}
				}
			} else if (udata.length || adata.length || ddata.length) {
				dirty = true
			}
			return dirty
		},
		onDA: function(self) {
			return function(evt, ui) {
				if (ui.source != "filter") {
					self.udata = [];
					self.ddata = [];
					self.adata = []
				}
			}
		},
		rollbackAdd: function(PM, data) {
			var adata = this.adata,
				rowList = [],
				paging = PM.type;
			for (var i = 0, len = adata.length; i < len; i++) {
				var rec = adata[i],
					rowData = rec.rowData;
				rowList.push({
					type: "delete",
					rowData: rowData
				})
			}
			this.adata = [];
			return rowList
		},
		rollbackDelete: function(PM, data) {
			var ddata = this.ddata,
				rowList = [],
				paging = PM.type;
			for (var i = ddata.length - 1; i >= 0; i--) {
				var rec = ddata[i],
					indx = rec.indx,
					rowIndx = rec.rowIndx,
					rowData = rec.rowData;
				rowList.push({
					type: "add",
					rowIndx: rowIndx,
					newRow: rowData
				})
			}
			this.ddata = [];
			return rowList
		},
		rollbackUpdate: function(PM, data) {
			var that = this.that,
				dirtyClass = this.options.trackModel.dirtyClass,
				udata = this.udata,
				rowList = [];
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					recId = rec.recId,
					rowData = rec.rowData,
					oldRow = {},
					newRow = rec.oldRow;
				if (recId == null) {
					continue
				}
				var dataIndxs = [];
				for (var dataIndx in newRow) {
					oldRow[dataIndx] = rowData[dataIndx];
					dataIndxs.push(dataIndx)
				}
				that.removeClass({
					rowData: rowData,
					dataIndx: dataIndxs,
					cls: dirtyClass,
					refresh: false
				});
				rowList.push({
					type: "update",
					rowData: rowData,
					newRow: newRow,
					oldRow: oldRow
				})
			}
			this.udata = [];
			return rowList
		},
		rollback: function(objP) {
			var that = this.that,
				DM = that.options.dataModel,
				PM = that.options.pageModel,
				refreshView = objP && objP.refresh != null ? objP.refresh : true,
				objType = objP && objP.type != null ? objP.type : null,
				rowListAdd = [],
				rowListUpdate = [],
				rowListDelete = [],
				data = DM.data;
			if (objType == null || objType == "update") {
				rowListUpdate = this.rollbackUpdate(PM, data)
			}
			if (objType == null || objType == "delete") {
				rowListAdd = this.rollbackDelete(PM, data)
			}
			if (objType == null || objType == "add") {
				rowListDelete = this.rollbackAdd(PM, data)
			}
			that._digestData({
				history: false,
				allowInvalid: true,
				checkEditable: false,
				source: "rollback",
				track: false,
				addList: rowListAdd,
				updateList: rowListUpdate,
				deleteList: rowListDelete
			});
			if (refreshView) {
				that.refreshView({
					header: false
				})
			}
		},
		update: function(objP) {
			var that = this.that,
				TM = this.options.trackModel,
				dirtyClass = TM.dirtyClass,
				rowData = objP.rowData || that.getRowData(objP),
				recId = that.getRecId({
					rowData: rowData
				}),
				dataIndx = objP.dataIndx,
				refresh = objP.refresh,
				columns = that.columns,
				getVal = that.getValueFromDataType,
				newRow = objP.row,
				udata = this.udata,
				newudata = udata.slice(0),
				_found = false;
			if (recId == null || (recId + "").indexOf("pq_tmp_") == 0) {
				return
			}
			for (var i = 0, len = udata.length; i < len; i++) {
				var rec = udata[i],
					oldRow = rec.oldRow;
				if (rec.rowData == rowData) {
					_found = true;
					for (var dataIndx in newRow) {
						var column = columns[dataIndx],
							dataType = column.dataType,
							newVal = newRow[dataIndx],
							newVal = getVal(newVal, dataType),
							oldVal = oldRow[dataIndx],
							oldVal = getVal(oldVal, dataType);
						if (oldRow.hasOwnProperty(dataIndx) && oldVal === newVal) {
							var obj = {
								rowData: rowData,
								dataIndx: dataIndx,
								refresh: refresh,
								cls: dirtyClass
							};
							that.removeClass(obj);
							delete oldRow[dataIndx]
						} else {
							var obj = {
								rowData: rowData,
								dataIndx: dataIndx,
								refresh: refresh,
								cls: dirtyClass
							};
							that.addClass(obj);
							if (!oldRow.hasOwnProperty(dataIndx)) {
								oldRow[dataIndx] = rowData[dataIndx]
							}
						}
					}
					if ($.isEmptyObject(oldRow)) {
						newudata.splice(i, 1)
					}
					break
				}
			}
			if (!_found) {
				var oldRow = {};
				for (var dataIndx in newRow) {
					oldRow[dataIndx] = rowData[dataIndx];
					var obj = {
						rowData: rowData,
						dataIndx: dataIndx,
						refresh: refresh,
						cls: dirtyClass
					};
					that.addClass(obj)
				}
				var obj = {
					rowData: rowData,
					recId: recId,
					oldRow: oldRow
				};
				newudata.push(obj)
			}
			this.udata = newudata
		}
	};
	fnGrid.getChanges = function(obj) {
		this.blurEditor({
			force: true
		});
		if (obj) {
			var format = obj.format;
			if (format) {
				if (format == "byVal") {
					return this.iUCData.getChangesValue(obj)
				} else if (format == "raw") {
					return this.iUCData.getChangesRaw()
				}
			}
		}
		return this.iUCData.getChanges()
	};
	fnGrid.rollback = function(obj) {
		this.blurEditor({
			force: true
		});
		this.iUCData.rollback(obj)
	};
	fnGrid.isDirty = function(ui) {
		return this.iUCData.isDirty(ui)
	};
	fnGrid.commit = function(obj) {
		this.iUCData.commit(obj)
	};
	fnGrid.updateRow = function(ui) {
		var that = this,
			rowList = ui.rowList || [{
				rowIndx: ui.rowIndx,
				newRow: ui.newRow || ui.row,
				rowData: ui.rowData,
				rowIndxPage: ui.rowIndxPage
			}],
			rowListNew = [];
		that.normalizeList(rowList).forEach(function(rlObj) {
			var newRow = rlObj.newRow,
				rowData = rlObj.rowData,
				dataIndx, oldRow = rlObj.oldRow = {};
			if (rowData) {
				for (dataIndx in newRow) {
					oldRow[dataIndx] = rowData[dataIndx]
				}
				rowListNew.push(rlObj)
			}
		});
		if (rowListNew.length) {
			var uid = {
					source: ui.source || "update",
					history: ui.history,
					checkEditable: ui.checkEditable,
					track: ui.track,
					allowInvalid: ui.allowInvalid,
					updateList: rowListNew
				},
				ret = that._digestData(uid);
			if (ret === false) {
				return false
			}
			if ($.isArray(ret)) {
				ret.forEach(function(arr) {
					that.refreshCell({
						rowIndx: arr[0],
						colIndx: arr[1],
						skip: true
					})
				})
			}
		}
	};
	fnGrid.getRecId = function(obj) {
		var that = this,
			DM = that.options.dataModel;
		obj.dataIndx = DM.recIndx;
		var recId = that.getCellData(obj);
		if (recId == null) {
			return null
		} else {
			return recId
		}
	};
	fnGrid.getCellData = function(obj) {
		var rowData = obj.rowData || this.getRowData(obj),
			dataIndx = obj.dataIndx;
		if (rowData) {
			return rowData[dataIndx]
		} else {
			return null
		}
	};
	fnGrid.getRowData = function(obj) {
		if (!obj) {
			return null
		}
		var objRowData = obj.rowData,
			recId;
		if (objRowData != null) {
			return objRowData
		}
		recId = obj.recId;
		if (recId == null) {
			var rowIndx = obj.rowIndx,
				rowIndx = rowIndx != null ? rowIndx : obj.rowIndxPage + this.riOffset,
				data = this.get_p_data(),
				rowData = data[rowIndx];
			return rowData
		} else {
			var options = this.options,
				DM = options.dataModel,
				recIndx = DM.recIndx,
				DMdata = DM.data;
			for (var i = 0, len = DMdata.length; i < len; i++) {
				var rowData = DMdata[i];
				if (rowData[recIndx] == recId) {
					return rowData
				}
			}
		}
		return null
	};
	fnGrid.addNodes = function(nodes, ri) {
		ri = ri == null ? this.options.dataModel.data.length : ri;
		this._digestData({
			addList: nodes.map(function(rd) {
				return {
					rowIndx: ri++,
					newRow: rd
				}
			}),
			source: "addNodes",
			checkEditable: false
		});
		this.refreshView()
	};
	fnGrid.deleteNodes = function(nodes) {
		this._digestData({
			deleteList: nodes.map(function(rd) {
				return {
					rowData: rd
				}
			}),
			source: "deleteNodes"
		});
		this.refreshView()
	};
	fnGrid.moveNodes = function(nodes, ri) {
		var self = this,
			o = self.options,
			riOffset = self.riOffset,
			data = o.dataModel.data;
		ri = ri == null ? data.length : ri;
		self._trigger("beforeMoveNode");
		nodes.forEach(function(node) {
			ri = pq.moveItem(node, data, data.indexOf(node), ri)
		});
		if (data != self.pdata) {
			self.pdata = data.slice(riOffset, o.pageModel.rPP + riOffset)
		}
		self.iRefresh.addRowIndx();
		self.iMerge.init();
		self._trigger("moveNode", null, {
			args: arguments
		});
		self.refresh()
	};
	fnGrid.deleteRow = function(ui) {
		var that = this,
			rowListNew = that.normalizeList(ui.rowList || [{
				rowIndx: ui.rowIndx,
				rowIndxPage: ui.rowIndxPage,
				rowData: ui.rowData
			}]);
		if (!rowListNew.length) {
			return false
		}
		this._digestData({
			source: ui.source || "delete",
			history: ui.history,
			track: ui.track,
			deleteList: rowListNew
		});
		if (ui.refresh !== false) {
			that.refreshView({
				header: false
			})
		}
	};
	fnGrid.addRow = function(ui) {
		var that = this,
			rowIndx, addList, offset = that.riOffset,
			DM = that.options.dataModel,
			data = DM.data = DM.data || [];
		ui.rowData && (ui.newRow = ui.rowData);
		ui.rowIndxPage != null && (ui.rowIndx = ui.rowIndxPage + offset);
		addList = ui.rowList || [{
			rowIndx: ui.rowIndx,
			newRow: ui.newRow
		}];
		if (!addList.length || this._digestData({
				source: ui.source || "add",
				history: ui.history,
				track: ui.track,
				checkEditable: ui.checkEditable,
				addList: addList
			}) === false) {
			return false
		}
		if (ui.refresh !== false) {
			this.refreshView({
				header: false
			})
		}
		rowIndx = addList[0].rowIndx;
		return rowIndx == null ? data.length - 1 : rowIndx
	}
})(jQuery);
(function() {
	window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(fn) {
		return setTimeout(fn, 10)
	};
	window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function(id) {
		clearTimeout(id)
	}
})();
(function($) {
	var _pq = $.paramquery;

	function cMouseSelection(that) {
		var self = this;
		self.that = that;
		that.on("cellClick", self.onCellClick.bind(self)).on("cellMouseDown", self.onCellMouseDown.bind(self)).on("cellMouseEnter", self.onCellMouseEnter.bind(self))
	}
	_pq.cMouseSelection = cMouseSelection;
	cMouseSelection.prototype = $.extend({
		onCellMouseDown: function(evt, ui) {
			if (evt.isDefaultPrevented()) {
				return
			}
			var self = this,
				that = self.that,
				rowIndx = ui.rowIndx,
				iSel = that.iSelection,
				colIndx = ui.colIndx,
				SM = that.options.selectionModel,
				type = SM.type,
				mode = SM.mode,
				isLeftMouse = !evt.which || evt.which == 1,
				last = iSel.addressLast();
			if ($(evt.originalEvent.target).is("textarea,select,input:not([type='checkbox'])")) return;
			if (type == "cell") {
				if (colIndx == null) {
					return
				}
				if (colIndx == -1) {
					if (!SM.row) {
						return
					}
					colIndx = undefined
				}
				if (evt.shiftKey && mode !== "single" && last) {
					var r1 = last.firstR,
						c1 = last.firstC;
					self.mousedown = {
						r1: r1,
						c1: c1
					};
					iSel.resizeOrReplace({
						r1: r1,
						c1: colIndx == null ? undefined : c1,
						r2: rowIndx,
						c2: colIndx,
						firstR: r1,
						firstC: c1
					})
				} else if (pq.isCtrl(evt) && mode !== "single") {
					self.mousedown = {
						r1: rowIndx,
						c1: colIndx
					};
					if (colIndx == null) iSel.add({
						r1: rowIndx,
						firstR: rowIndx,
						firstC: that.getFirstVisibleCI()
					});
					else iSel.add({
						r1: rowIndx,
						c1: colIndx,
						firstR: rowIndx,
						firstC: colIndx
					})
				} else if (isLeftMouse) {
					self.mousedown = {
						r1: rowIndx,
						c1: colIndx
					};
					iSel.clearOther({
						r1: rowIndx,
						c1: colIndx
					}, true);
					if (colIndx == null) {
						iSel.resizeOrReplace({
							r1: rowIndx,
							firstR: rowIndx,
							firstC: that.getFirstVisibleCI()
						})
					} else {
						iSel.resizeOrReplace({
							r1: rowIndx,
							c1: colIndx,
							firstR: rowIndx,
							firstC: colIndx
						})
					}
				}
			}
			if (isLeftMouse) {
				that.focus(ui)
			}
			if (!SM.native && !("ontouchend" in document)) {
				evt.preventDefault()
			}
			that.one("mousePQUp", self.onMousePQUp.bind(self))
		},
		onCellMouseEnter: function(evt, ui) {
			var that = this.that,
				SM = that.options.selectionModel,
				type = SM.type,
				mousedown = this.mousedown,
				mode = SM.mode;
			if (mousedown && mode !== "single") {
				if (type === "cell") {
					var r1 = mousedown.r1,
						c1 = mousedown.c1,
						r2 = ui.rowIndx,
						c2 = ui.colIndx,
						iSel = that.Selection();
					that.scrollCell({
						rowIndx: r2,
						colIndx: c2
					});
					iSel.resizeOrReplace({
						r1: r1,
						c1: c1,
						r2: r2,
						c2: c2,
						firstR: r1,
						firstC: c1
					})
				}
				that.focusT(ui)
			}
		},
		onCellClick: function(evt, ui) {
			var that = this.that,
				SM = that.options.selectionModel,
				single = SM.mode == "single",
				toggle = SM.toggle,
				isSelected, selection, _selLen, iRows = that.iRows;
			if (SM.type == "row") {
				if (!SM.row && ui.colIndx == -1) {
					return
				}
				isSelected = iRows.isSelected(ui);

				function selLen() {
					if (_selLen == null) {
						selection = iRows.getSelection();
						_selLen = selection.length
					}
					return _selLen
				}
				if (evt.shiftKey && !single && selLen()) {
					iRows.extend(ui)
				} else if (toggle || pq.isCtrl(evt)) {
					if (isSelected) {
						iRows.remove(ui)
					} else {
						ui.isFirst = true;
						iRows[!single && selLen() ? "add" : "replace"](ui)
					}
				} else {
					if (isSelected) {
						iRows.removeAll()
					} else {
						ui.isFirst = true;
						iRows.replace(ui)
					}
				}
			}
		},
		onMousePQUp: function() {
			this.mousedown = null
		}
	}, new _pq.cClass)
})(jQuery);
(function($) {
	var iExcel = null,
		pasteProgress = false,
		_pq = $.paramquery,
		_pgrid = _pq.pqGrid.prototype;
	$.extend(_pgrid.options, {
		copyModel: {
			on: true,
			render: false,
			zIndex: 1e4
		},
		cutModel: {
			on: true
		},
		pasteModel: {
			on: true,
			compare: "byVal",
			select: true,
			validate: true,
			allowInvalid: true,
			type: "replace"
		}
	});
	$.extend(_pgrid, {
		_setGlobalStr: function(str) {
			cExcel.clip = str
		},
		canPaste: function() {
			return !!_pq.cExcel.clip
		},
		clearPaste: function() {
			_pq.cExcel.clip = ""
		},
		copy: function(ui) {
			var that = this,
				iSel = that.iSelection;
			if (iSel.address().length) {
				return iSel.copy(ui)
			} else {
				that.iRows.toRange().copy(ui)
			}
		},
		cut: function(ui) {
			return this.iSelection.cut(ui)
		},
		paste: function(ui) {
			ui = ui || {};
			var self = this,
				clipBoard = (navigator || {}).clipboard,
				fn = function() {
					iExcel.paste(ui);
					iExcel = null
				};
			iExcel = new cExcel(self);
			if (ui.text == undefined && clipBoard && clipBoard.readText) {
				clipBoard.readText().then(function(text) {
					ui.text = text;
					fn()
				}).catch(function(err) {
					fn()
				})
			} else {
				fn()
			}
		},
		clear: function() {
			var iSel = this.iSelection;
			if (iSel.address().length) {
				iSel.clear()
			} else {
				this.iRows.toRange().clear()
			}
		}
	});
	var cExcel = _pq.cExcel = function(that) {
		this.that = that
	};
	cExcel.clip = "";
	cExcel.prototype = {
		initClip: function($ae, $parent) {
			var self = this,
				that = self.that,
				val;
			self.$oldAE = $ae;
			val = $ae.val();
			that.iKeyNav.ignoreBlur(function() {
				$ae.replaceWith("<textarea></textarea>");
				$ae = $parent.children();
				$ae.val(val);
				$ae.focus()
			});
			return $ae
		},
		destroyClip: function($ae) {
			var self = this,
				$oldAE = self.$oldAE;
			if ($ae.parent().is(".pq-focus-mgr")) {
				self.that.iKeyNav.ignoreBlur(function() {
					$ae.replaceWith($oldAE);
					$oldAE.focus();
					self.$oldAE = null
				})
			}
		},
		getRows: function(text) {
			text = text.replace(/\n$/, "");
			var rnd = Math.random() + "",
				regexp = new RegExp(rnd, "g");
			text = text.replace(/(^|\t|\n)"(?=[^\t]*?[\r\n])([^"]|"")*"(?=$|\t|\n)/g, function(a) {
				return a.replace(/(?!^(\r\n|\n))\n/g, rnd).replace(/^(\t|\n)?"/, "$1").replace(/"$/, "").replace(/""/g, '"')
			});
			return text.split("\n").map(function(rd) {
				return rd.replace(regexp, "\n")
			})
		},
		paste: function(ui) {
			ui = ui || {};
			var that = this.that,
				dest = ui.dest,
				clip = ui.clip,
				text = ui.text || (clip ? clip.length ? clip.val() : "" : cExcel.clip),
				rows = this.getRows(text),
				rows_length = rows.length,
				CM = that.colModel,
				o = that.options,
				readCell = that.readCell,
				PSTM = o.pasteModel,
				SMType = "row",
				refreshView = false,
				CMLength = CM.length,
				i = 0;
			clip && clip.val("");
			if (!PSTM.on) {
				return
			}
			if (text.length == 0 || rows_length == 0) {
				return
			}
			for (; i < rows_length; i++) {
				rows[i] = rows[i].split("\t")
			}
			var PMtype = that.$cont.hasClass("pq-focus") ? "append" : PSTM.type,
				selRowIndx, selColIndx, selEndRowIndx, selEndColIndx, iSel = dest ? that.Range(dest) : that.Selection(),
				_areas = iSel.address(),
				areas = _areas.length ? _areas : that.iRows.toRange().address(),
				area = areas[0],
				tui = {
					rows: rows,
					areas: [area]
				};
			if (that._trigger("beforePaste", null, tui) === false) {
				return false
			}
			if (area && that.getRowData({
					rowIndx: area.r1
				})) {
				SMType = area.type == "row" ? "row" : "cell";
				selRowIndx = area.r1;
				selEndRowIndx = area.r2;
				selColIndx = area.c1;
				selEndColIndx = area.c2
			} else {
				SMType = "cell";
				selRowIndx = 0;
				selEndRowIndx = that.pageData().length - 1;
				selColIndx = 0;
				selEndColIndx = 0
			}
			var selRowIndx2, modeV;
			if (PMtype == "replace") {
				selRowIndx2 = selRowIndx;
				modeV = selEndRowIndx - selRowIndx + 1 < rows_length ? "extend" : "repeat"
			} else if (PMtype == "append") {
				selRowIndx2 = selEndRowIndx + 1;
				modeV = "extend"
			} else if (PMtype == "prepend") {
				selRowIndx2 = selRowIndx;
				modeV = "extend"
			}
			var modeH, lenV = modeV == "extend" ? rows_length : selEndRowIndx - selRowIndx + 1,
				lenH, lenHCopy;
			var ii = 0,
				skippedR = 0,
				addList = [],
				updateList = [],
				rowsAffected = 0;
			for (i = 0; i < lenV; i++) {
				var row = rows[ii],
					rowIndx = i + selRowIndx2,
					rowData = PMtype == "replace" ? that.getRowData({
						rowIndx: rowIndx
					}) : null,
					oldRow = rowData ? {} : null,
					newRow = {};
				if (row === undefined && modeV === "repeat") {
					ii = 0;
					row = rows[ii]
				}
				if (rowData && rowData.pq_paste === false) {
					lenV++;
					skippedR++;
					continue
				}
				ii++;
				var cells = row,
					cellsLength = cells.length;
				if (!lenH) {
					if (SMType == "cell") {
						modeH = selEndColIndx - selColIndx + 1 < cellsLength ? "extend" : "repeat";
						lenH = modeH == "extend" ? cellsLength : selEndColIndx - selColIndx + 1;
						if (isNaN(lenH)) {
							throw "lenH NaN. assert failed."
						}
						if (lenH + selColIndx > CMLength) {
							lenH = CMLength - selColIndx
						}
					} else {
						lenH = CMLength;
						selColIndx = 0
					}
				}
				var jj = 0,
					j = 0,
					skippedC = 0;
				lenHCopy = lenH;
				for (j = 0; j < lenHCopy; j++) {
					if (jj >= cellsLength) {
						jj = 0
					}
					var colIndx = j + selColIndx,
						column = CM[colIndx],
						cell = cells[jj],
						dataIndx = column.dataIndx;
					if (column.paste === false) {
						skippedC++;
						if (modeH == "extend") {
							if (lenHCopy + selColIndx < CMLength) {
								lenHCopy++
							}
						}
						continue
					} else {
						jj++;
						newRow[dataIndx] = cell;
						if (oldRow) {
							oldRow[dataIndx] = readCell(rowData, column)
						}
					}
				}
				if ($.isEmptyObject(newRow) == false) {
					if (rowData == null) {
						refreshView = true;
						addList.push({
							newRow: newRow,
							rowIndx: rowIndx
						})
					} else {
						updateList.push({
							newRow: newRow,
							rowIndx: rowIndx,
							rowData: rowData,
							oldRow: oldRow
						})
					}
					rowsAffected++
				}
			}
			var dui = {
				addList: addList,
				updateList: updateList,
				source: "paste",
				allowInvalid: PSTM.allowInvalid,
				validate: PSTM.validate
			};
			that._digestData(dui);
			that[refreshView ? "refreshView" : "refresh"]({
				header: false
			});
			if (PSTM.select) {
				that.Range({
					r1: selRowIndx2,
					c1: selColIndx,
					r2: selRowIndx2 + rowsAffected - 1 + skippedR,
					c2: modeH == "extend" ? selColIndx + lenH - 1 + skippedC : selEndColIndx
				}).select()
			}
			that._trigger("paste", null, tui)
		}
	};
	$(document).off(".pqExcel").on("keydown.pqExcel", function(evt) {
		var $ae = $(document.activeElement),
			$parent = $ae.parent(),
			isFocusMgr = $parent.is(".pq-focus-mgr:not(.pq-editor-outer)"),
			isFocusMgrBody = isFocusMgr && !$parent.hasClass("pq-focus-mgr-head"),
			key = evt.key,
			keyCode = evt.keyCode,
			KC = $.ui.keyCode;
		if (isFocusMgr && (keyCode == KC.UP || keyCode == KC.DOWN)) {
			evt.preventDefault()
		}
		if (pq.isCtrl(evt) && isFocusMgrBody) {
			var $grid = $ae.closest(".pq-grid"),
				that = $grid.pqGrid("instance");
			if (iExcel || $ae.length && $grid.length) {
				if (!iExcel) {
					try {
						if (that.options.selectionModel.native) {
							return true
						}
						iExcel = new cExcel(that)
					} catch (ex) {
						return true
					}
				}
				$ae = iExcel.initClip($ae, $parent);
				if (key == "f" || key == "F") {
					$(document).trigger("keyup.pqExcel")
				} else if (key == "c" || key == "C") {
					that.copy({
						clip: $ae
					})
				} else if (key == "x" || key == "X") {
					that.copy({
						cut: true,
						clip: $ae
					})
				} else if (key == "v" || key == "V") {
					if (!pasteProgress) {
						pasteProgress = true;
						window.setTimeout(function() {
							if (iExcel) {
								iExcel.paste({
									clip: $ae
								})
							}
							pasteProgress = false
						}, 3)
					}
				}
			}
		}
	}).on("keyup.pqExcel", function(evt) {
		var $ae = $(evt.target);
		if (!pq.isCtrl(evt) && iExcel) {
			function fn() {
				iExcel.destroyClip($ae);
				iExcel = null
			}
			if (pasteProgress) iExcel.that.one("paste", function() {
				fn()
			});
			else fn()
		}
	}).on("click.pqExcel keydown.pqExcel", function(evt) {
		if (evt.type == "click" || $.ui.keyCode.ENTER == evt.keyCode) {
			$(evt.target).trigger("pq:clickE")
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		pq_options = _pq.pqGrid.prototype.options,
		historyModel = {
			on: true,
			checkEditable: true,
			checkEditableAdd: false,
			allowInvalid: true
		};
	pq_options.historyModel = pq_options.historyModel || historyModel;
	var cHistory = _pq.cHistory = function(that) {
		var self = this;
		self.that = that;
		self.options = that.options;
		self.records = [];
		self.counter = 0;
		self.id = 0;
		that.on("keyDown", self.onKeyDown.bind(self)).on("dataAvailable", function(evt, ui) {
			if (ui.source != "filter") {
				self.reset()
			}
		})
	};
	cHistory.prototype = {
		onKeyDown: function(evt, ui) {
			var keyCodes = {
					z: "90",
					y: "89",
					c: "67",
					v: "86"
				},
				ctrlMeta = pq.isCtrl(evt);
			if (ctrlMeta && evt.keyCode == keyCodes.z) {
				if (this.undo()) {}
				return false
			} else if (ctrlMeta && evt.keyCode == keyCodes.y) {
				if (this.redo()) {}
				return false
			}
		},
		resetUndo: function() {
			if (this.counter == 0) {
				return false
			}
			this.counter = 0;
			var that = this.that;
			that._trigger("history", null, {
				type: "resetUndo",
				num_undo: 0,
				num_redo: this.records.length - this.counter,
				canUndo: false,
				canRedo: true
			})
		},
		reset: function() {
			if (this.counter == 0 && this.records.length == 0) {
				return false
			}
			this.records = [];
			this.counter = 0;
			this.id = 0;
			this.that._trigger("history", null, {
				num_undo: 0,
				num_redo: 0,
				type: "reset",
				canUndo: false,
				canRedo: false
			})
		},
		increment: function() {
			var records = this.records,
				len = records.length;
			if (len) {
				var id = records[len - 1].id;
				this.id = id + 1
			} else {
				this.id = 0
			}
		},
		push: function(objP) {
			var prevCanRedo = this.canRedo();
			var records = this.records,
				counter = this.counter;
			if (records.length > counter) {
				records.splice(counter, records.length - counter)
			}
			records[counter] = $.extend({
				id: this.id
			}, objP);
			this.counter++;
			var that = this.that,
				canUndo, canRedo;
			if (this.counter == 1) {
				canUndo = true
			}
			if (prevCanRedo && this.counter == records.length) {
				canRedo = false
			}
			that._trigger("history", null, {
				type: "add",
				canUndo: canUndo,
				canRedo: canRedo,
				num_undo: this.counter,
				num_redo: 0
			})
		},
		canUndo: function() {
			if (this.counter > 0) return true;
			else return false
		},
		canRedo: function() {
			return this.counter < this.records.length
		},
		undo: function() {
			var prevCanRedo = this.canRedo(),
				that = this.that,
				HM = this.options.historyModel,
				records = this.records;
			if (this.counter > 0) {
				this.counter--
			} else {
				return false
			}
			var counter = this.counter,
				record = records[counter],
				callback = record.callback,
				canRedo, canUndo, id = record.id,
				updateList, addList, deleteList;
			if (callback) callback();
			else {
				updateList = record.updateList.map(function(rowListObj) {
					return {
						rowIndx: that.getRowIndx({
							rowData: rowListObj.rowData
						}).rowIndx,
						rowData: rowListObj.rowData,
						oldRow: rowListObj.newRow,
						newRow: rowListObj.oldRow
					}
				}), deleteList = record.addList.map(function(rowListObj) {
					return {
						rowData: rowListObj.newRow
					}
				}), addList = record.deleteList.map(function(rowListObj) {
					return {
						newRow: rowListObj.rowData,
						rowIndx: rowListObj.rowIndx
					}
				});
				var ret = that._digestData({
					history: false,
					source: "undo",
					checkEditable: HM.checkEditable,
					checkEditableAdd: HM.checkEditableAdd,
					allowInvalid: HM.allowInvalid,
					addList: addList,
					updateList: updateList,
					deleteList: deleteList
				});
				that[addList.length || deleteList.length ? "refreshView" : "refresh"]({
					source: "undo",
					header: false
				})
			}
			if (prevCanRedo === false) {
				canRedo = true
			}
			if (this.counter == 0) {
				canUndo = false
			}
			that._trigger("history", null, {
				canUndo: canUndo,
				canRedo: canRedo,
				type: "undo",
				num_undo: this.counter,
				num_redo: this.records.length - this.counter
			});
			return true
		},
		redo: function() {
			var prevCanUndo = this.canUndo(),
				that = this.that,
				HM = this.options.historyModel,
				counter = this.counter,
				records = this.records;
			if (counter == records.length) {
				return false
			}
			var record = records[counter],
				callback = record.callback,
				id = record.id,
				updateList, addList, deleteList;
			if (callback) callback(true);
			else {
				updateList = record.updateList.map(function(rowListObj) {
					return {
						rowIndx: that.getRowIndx({
							rowData: rowListObj.rowData
						}).rowIndx,
						rowData: rowListObj.rowData,
						newRow: rowListObj.newRow,
						oldRow: rowListObj.oldRow
					}
				}), deleteList = record.deleteList.map(function(rowListObj) {
					return {
						rowData: rowListObj.rowData
					}
				}), addList = record.addList.map(function(rowListObj) {
					return {
						newRow: rowListObj.newRow,
						rowIndx: rowListObj.rowIndx
					}
				});
				var ret = that._digestData({
					history: false,
					source: "redo",
					checkEditable: HM.checkEditable,
					checkEditableAdd: HM.checkEditableAdd,
					allowInvalid: HM.allowInvalid,
					addList: addList,
					updateList: updateList,
					deleteList: deleteList
				});
				that[addList.length || deleteList.length ? "refreshView" : "refresh"]({
					source: "redo",
					header: false
				})
			}
			if (this.counter < records.length) {
				this.counter++
			}
			var canUndo, canRedo;
			if (prevCanUndo == false) {
				canUndo = true
			}
			if (this.counter == this.records.length) {
				canRedo = false
			}
			that._trigger("history", null, {
				canUndo: canUndo,
				canRedo: canRedo,
				type: "redo",
				num_undo: this.counter,
				num_redo: this.records.length - this.counter
			});
			return true
		}
	};
	var fnGrid = _pq.pqGrid.prototype;
	fnGrid.history = function(obj) {
		var method = obj.method;
		return this.iHistory[method](obj)
	};
	fnGrid.History = function() {
		return this.iHistory
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	pq.filter = {
		dpBeforeShow: function(grid, di, i) {
			return function() {
				var gco = grid.getDataCascade(di),
					min, max;
				if (gco.length) {
					min = gco.find(rd => !!rd[di])[di];
					max = gco[gco.length - 1][di]
				}
				$(this).datepicker("option", "defaultDate", new Date(i == 1 ? max : min))
			}
		},
		datepicker: function(ui) {
			var column = ui.column,
				di = column.dataIndx,
				grid = this,
				options = grid.options,
				filterUI = ui.filterUI,
				$editor = ui.$editor,
				dt = column.dataType,
				fmtDateFilter = column.fmtDateFilter || options.fmtDateFilter || column.format,
				ui2 = {
					dateFormat: pq.excelToJui(fmtDateFilter || "yyyy-mm-dd"),
					changeYear: true,
					changeMonth: true
				};
			if (dt == "date") {
				$editor.each(function(i, ele) {
					var options = $.extend({}, ui2, i == 1 ? filterUI.dpOptions2 || filterUI.dpOptions : filterUI.dpOptions);
					if (!options.defaultDate) {
						options.beforeShow = options.beforeShow || pq.filter.dpBeforeShow(grid, di, i)
					}
					$(ele).datepicker(options)
				});
				return true
			}
		},
		filterFnEq: function(ui, grid) {
			var dt = (ui.column || {}).dataType;
			if (dt == "date") {
				return this.filterFnTD(ui, grid)
			} else if (dt == "bool") {
				return {
					type: "checkbox"
				}
			} else {
				return $.extend({
					maxCheck: 1
				}, this.filterFnSelect(ui, grid))
			}
		},
		filterFnSelect: function(ui, grid) {
			var di = ui.column.dataIndx,
				indx = ui.indx;
			return {
				type: "select",
				style: "padding-" + (grid && grid.options.rtl ? "left" : "right") + ":16px;cursor:default;",
				attr: "readonly",
				valueIndx: di,
				labelIndx: di,
				options: this.options,
				init: indx == 0 ? this.rangeInit.bind(grid) : function() {}
			}
		},
		filterFnT: function() {
			return {
				type: "textbox",
				attr: `autocomplete='${Math.random()}'`
			}
		},
		filterFnTD: function() {
			return {
				type: "textbox",
				attr: `autocomplete='${Math.random()}'`,
				init: pq.filter.datepicker
			}
		},
		getVal: function(filter) {
			var crule0 = (filter.crules || [])[0] || {};
			return [crule0.value, crule0.value2, crule0.condition]
		},
		setVal: function(filter, val) {
			var crules = filter.crules = filter.crules || [];
			crules[0] = crules[0] || {};
			crules[0].value = val;
			return val
		}
	};
	$.extend(pq.filter, {
		conditions: {
			begin: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			between: {
				stringList: 1,
				date: 1,
				number: 1,
				filter: {
					attr: `autocomplete='${Math.random()}'`,
					type: "textbox2",
					init: pq.filter.datepicker
				}
			},
			contain: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			equal: {
				string: 1,
				bool: 1,
				date: 1,
				number: 1,
				filterFn: pq.filter.filterFnEq
			},
			empty: {
				string: 1,
				bool: 1,
				date: 1,
				number: 1,
				nr: 1
			},
			end: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			great: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			gte: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			less: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			lte: {
				stringList: 1,
				number: 1,
				date: 1,
				filterFn: pq.filter.filterFnTD
			},
			notbegin: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			notcontain: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			notequal: {
				string: 1,
				date: 1,
				number: 1,
				bool: 1,
				filterFn: pq.filter.filterFnEq
			},
			notempty: {
				string: 1,
				bool: 1,
				date: 1,
				number: 1,
				nr: 1
			},
			notend: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			},
			range: {
				cascade: 1,
				string: 1,
				number: 1,
				date: 1,
				bool: 1,
				filterFn: pq.filter.filterFnSelect
			},
			regexp: {
				string: 1,
				numberList: 1,
				dateList: 1,
				filterFn: pq.filter.filterFnT
			}
		},
		getConditionsCol: function(column, filterUI) {
			var list = filterUI.conditionList || function(self) {
					var list = self.getConditionsDT(pq.getDataType(column));
					list.sort();
					return list
				}(this),
				exclude = filterUI.conditionExclude,
				obj = {};
			if (exclude) {
				exclude.forEach(function(val) {
					obj[val] = 1
				});
				list = list.filter(function(val) {
					return !obj[val]
				})
			}
			return list
		},
		getConditionsDT: function(dt) {
			var arr = [],
				key, conditions = this.conditions,
				obj, d;
			for (key in conditions) {
				obj = conditions[key];
				d = obj[dt + "List"];
				if (obj[dt] && d !== 0 || d) arr.push(key)
			}
			return arr
		},
		getFilterUI: function(ui, grid) {
			var column = ui.column,
				filterFn = column.filterFn,
				filter = column.filter || {},
				obj = this.conditions[ui.condition] || {},
				_filterFn = obj.filterFn,
				_filter = obj.filter || {};
			delete filter.type;
			filterFn = filterFn ? filterFn.call(grid, ui) || {} : {};
			_filterFn = _filterFn ? _filterFn.call(this, ui, grid) || {} : {};
			var filterUI = $.extend({}, _filter, _filterFn, filter, filterFn);
			filterUI.condition = ui.condition;
			filterUI.init = [];
			filterUI.options = [];
			[filterFn, filter, _filterFn, _filter].forEach(function(f) {
				if (f.init) filterUI.init.push(f.init);
				if (f.options) filterUI.options.push(f.options)
			});
			return filterUI
		},
		options: function(ui) {
			var col = ui.column,
				f = ui.filterUI,
				diG = f.groupIndx,
				di = col.dataIndx;
			return this.getDataCascade(di, diG, f.diExtra)
		},
		getOptions: function(col, filterUI, grid) {
			var options = filterUI.options,
				di = col.dataIndx,
				ui = {
					column: col,
					dataIndx: di,
					filterUI: filterUI,
					condition: filterUI.condition
				},
				i = 0,
				len = options.length,
				o, opt;
			for (; i < len; i++) {
				o = options[i];
				if (o) {
					opt = pq.isFn(o) ? o.call(grid, ui) : o;
					if (opt) {
						opt = grid.getPlainOptions(opt, di);
						opt = grid.removeNullOptions(opt, filterUI.dataIndx || di, filterUI.groupIndx);
						return opt
					}
				}
			}
			return []
		},
		rangeInit: function(ui) {
			var grid = this,
				appendTo = grid.options.filterModel.appendTo,
				column = ui.column,
				id = grid.uuid + "_" + column.dataIndx,
				$editor = ui.$editor,
				headMenu = ui.headMenu,
				filterUI = ui.filterUI,
				remove = _ => {
					$("#" + id).remove()
				};
			if (!headMenu) {
				$editor.parent().off("click keydown").on("click keydown", function(evt) {
					var key = evt.key,
						$popup = $("#" + id);
					appendTo = typeof appendTo == "function" ? appendTo.call(grid) : appendTo;
					grid.off("change", remove).one("change", remove);

					function position() {
						pq.position($popup, {
							my: "left top",
							at: "left bottom",
							of: $editor
						})
					}
					if (key && key != "ArrowDown" && key != "Enter") {
						return
					}
					evt.preventDefault();
					if ($popup[0]) {
						$popup.remove();
						$popup = null
					}
					var i = new pq.cFilterMenu.select(grid, column),
						$div = $popup = grid.$filterpopup = $("<div id='" + id + "' style='width:270px;' class='pq-theme'><div></div></div>").appendTo(appendTo == "grid" ? grid.widget() : appendTo || document.body),
						$grid = $div.children();
					pq.makePopup($div[0], $editor[0], {
						closeOnEle: true
					});
					position();
					i.create($grid, filterUI);
					position();
					pq.focusEle(null, $popup)
				})
			}
		},
		getType: function(condition, column) {
			var obj = this.conditions[condition] || {},
				filterFn = obj.filterFn,
				_filter = obj.filter || {};
			return _filter.type || (filterFn ? filterFn.call(this, {
				condition: condition,
				column: column
			}) : {}).type
		}
	});
	var cFilterData = function(that) {
		var self = this;
		self.that = that;
		that.on("load", self.onLoad.bind(self)).on("filter clearFilter", self.onFilterChange.bind(self))
	};
	_pq.cFilterData = cFilterData;
	var cFc = cFilterData.conditions = {
		equal: function(cd, value) {
			return cd == value
		},
		notequal: function() {
			return !cFc.equal.apply(this, arguments)
		},
		contain: function(cd, value) {
			return (cd + "").indexOf(value) != -1
		},
		notcontain: function() {
			return !cFc.contain.apply(this, arguments)
		},
		empty: function(cd) {
			return cd.length == 0
		},
		notempty: function() {
			return !cFc.empty.apply(this, arguments)
		},
		begin: function(cd, value) {
			return (cd + "").indexOf(value) == 0
		},
		notbegin: function() {
			return !cFc.begin.apply(this, arguments)
		},
		end: function(cd, value) {
			cd = cd + "";
			value = value + "";
			var lastIndx = cd.lastIndexOf(value);
			if (lastIndx != -1 && lastIndx + value.length == cd.length) {
				return true
			}
		},
		notend: function() {
			return !cFc.end.apply(this, arguments)
		},
		regexp: function(cd, value) {
			if (value.test(cd)) {
				value.lastIndex = 0;
				return true
			}
		},
		great: function(cd, value) {
			return cd > value
		},
		gte: function(cd, value) {
			return cd >= value
		},
		between: function(cd, value, value2) {
			return cd >= value && cd <= value2
		},
		range: function(cd, value) {
			return $.inArray(cd, value) != -1
		},
		less: function(cd, value) {
			return cd < value
		},
		lte: function(cd, value) {
			return cd <= value
		}
	};
	cFilterData.convert = function(cd, dataType) {
		if (cd == null || cd === "") {
			return ""
		} else if (dataType == "string") {
			cd = (cd + "").trim().toUpperCase()
		} else if (dataType == "date") {
			cd = Date.parse(cd)
		} else if (dataType == "number") {
			if (cd * 1 == cd) {
				cd = cd * 1
			}
		} else if (dataType == "bool") {
			cd = String(cd).toLowerCase()
		}
		return cd
	};
	cFilterData.convertEx = function(cd, dt, condition, column, grid) {
		var dt2 = pq.getDataType({
				dataType: dt
			}),
			_f = pq.filter.conditions[condition],
			f = _f[dt2];
		if (f) {
			return this.convert(cd, dt2)
		} else {
			if (_f.string) {
				if (column) {
					cd = grid.formatCol(column, cd)
				}
				return condition == "regexp" ? cd : this.convert(cd, "string")
			} else if (_f.number) {
				return this.convert(cd, "number")
			}
		}
	};
	cFilterData.prototype = {
		addMissingConditions: function(rules) {
			var that = this.that;
			rules.forEach(function(rule) {
				var filter = that.getColumn({
					dataIndx: rule.dataIndx
				}).filter || {};
				rule.condition = rule.condition === undefined ? pq.filter.getVal(filter)[2] : rule.condition
			})
		},
		clearFilters: function(CM) {
			CM.forEach(function(column) {
				var filter = column.filter,
					conds = pq.filter.conditions;
				if (filter) {
					(filter.crules || []).forEach(function(crule) {
						if ((conds[crule.condition] || {}).nr) {
							crule.condition = undefined
						}
						crule.value = crule.value2 = undefined
					})
				}
			})
		},
		compatibilityCheck: function(ui) {
			var data = ui.data,
				rule, str = "Incorrect filter parameters. Please check upgrade guide";
			if (data) {
				if (rule = data[0]) {
					if (rule.hasOwnProperty("dataIndx") && rule.hasOwnProperty("value")) {
						throw str
					}
				} else if (!ui.rules) {
					throw str
				}
			}
		},
		copyRuleToColumn: function(rule, column, oper) {
			var filter = column.filter = column.filter || {},
				crules = rule.crules || [],
				crule0 = crules[0],
				condition = crule0 ? crule0.condition : rule.condition,
				value = crule0 ? crule0.value : rule.value,
				value2 = crule0 ? crule0.value2 : rule.value2;
			if (oper == "remove") {
				filter.on = false;
				if (condition) {
					filter.crules = [{
						condition: condition,
						value: condition == "range" ? [] : undefined
					}]
				} else {
					filter.crules = undefined
				}
			} else {
				filter.on = true;
				filter.mode = rule.mode;
				filter.crules = crule0 ? crules : [{
					condition: condition,
					value: value,
					value2: value2
				}]
			}
		},
		filter: function(objP) {
			objP = objP || {};
			this.compatibilityCheck(objP);
			var that = this.that,
				o = that.options,
				header = false,
				data = objP.data,
				rules = objP.rules = objP.rules || (objP.rule ? [objP.rule] : []),
				rule, column, apply = !data,
				DM = o.dataModel,
				location = DM.location,
				FM = o.filterModel,
				FMType = FM.type,
				mode = objP.mode || FM.mode,
				oper = objP.oper,
				replace = oper == "replace",
				CM = apply ? that.colModel : this.getCMFromRules(rules),
				j = 0,
				rulesLength = rules.length;
			if (oper != "remove") this.addMissingConditions(rules);
			if (apply) {
				if (that._trigger("beforeFilter", null, objP) === false) {
					return
				}
				objP.header != null && (header = objP.header);
				if (replace) {
					this.clearFilters(CM)
				}
				for (; j < rulesLength; j++) {
					rule = rules[j];
					column = that.getColumn({
						dataIndx: rule.dataIndx
					});
					this.copyRuleToColumn(rule, column, oper)
				}
			} else {
				for (; j < rulesLength; j++) {
					rule = rules[j];
					column = CM[j];
					this.copyRuleToColumn(rule, column)
				}
			}
			var obj2 = {
				header: header,
				CM: CM,
				data: data,
				rules: rules,
				mode: mode
			};
			if (location != "local" && FMType != "local") {
				that.refreshDataAndView(obj2)
			} else {
				obj2.source = "filter";
				obj2.trigger = false;
				return that._onDataAvailable(obj2)
			}
		},
		hideRows: function(arrS, data, FMmode) {
			var i = 0,
				len = data.length,
				rowData;
			for (; i < len; i++) {
				rowData = data[i];
				if (arrS.length) rowData.pq_hidden = rowData.pq_filter = !this.isMatchRow(rowData, arrS, FMmode);
				else if (rowData.pq_filter) {
					delete rowData.pq_filter;
					delete rowData.pq_hidden
				}
			}
		},
		filterLocalData: function(objP) {
			objP = objP || {};
			var self = this,
				that = self.that,
				ui, data = objP.data,
				apply = !data,
				CM = apply ? that.colModel : objP.CM,
				arrS = self.getRulesFromCM({
					CM: CM,
					apply: apply
				}),
				options = that.options,
				DM = options.dataModel,
				iSort = that.iSort,
				filtered, data1 = data || DM.data,
				data2 = DM.dataUF = DM.dataUF || [],
				data11 = [],
				data22 = [],
				FM = options.filterModel,
				FMmode = objP.mode || FM.mode,
				ui = {
					filters: arrS,
					mode: FMmode,
					data: data1
				};
			if (FM.hideRows) {
				ui.hideRows = true;
				if (that._trigger("customFilter", null, ui) !== false) {
					self.hideRows(arrS, data1, FMmode)
				}
			} else {
				if (apply) {
					if (data2.length) {
						filtered = true;
						for (var i = 0, len = data2.length; i < len; i++) {
							data1.push(data2[i])
						}
						data2 = DM.dataUF = []
					} else {
						if (!arrS.length) {
							return {
								data: data1,
								dataUF: data2
							}
						} else {
							iSort.saveOrder()
						}
					}
				}
				if (FM.on && FMmode && arrS && arrS.length) {
					if (data1.length) {
						if (that._trigger("customFilter", null, ui) === false) {
							data11 = ui.dataTmp;
							data22 = ui.dataUF
						} else {
							for (var i = 0, len = data1.length; i < len; i++) {
								var rowData = data1[i];
								if (!self.isMatchRow(rowData, arrS, FMmode)) {
									data22.push(rowData)
								} else {
									data11.push(rowData)
								}
							}
						}
					}
					data1 = data11;
					data2 = data22;
					if (iSort.readSorter().length == 0) {
						data1 = iSort.sortLocalData(data1)
					}
					if (apply) {
						DM.data = data1;
						DM.dataUF = data2
					}
				} else if (filtered && apply) {
					if (iSort.readSorter().length == 0) {
						data1 = iSort.sortLocalData(data1)
					}
					ui = {
						data: data1
					};
					if (that._trigger("clearFilter", null, ui) === false) {
						data1 = ui.data
					}
					DM.data = data1;
					that._queueATriggers.filter = {
						ui: {
							type: "local"
						}
					}
				}
			}
			if (apply) {
				that._queueATriggers.filter = {
					ui: {
						type: "local",
						rules: arrS
					}
				}
			}
			return {
				data: data1,
				dataUF: data2
			}
		},
		_getRulesFromCM: function(location, filter, condition, value, value2, dataType, getValue) {
			if (condition == "between") {
				if (value === "" || value == null) {
					condition = "lte";
					value = getValue(value2, dataType, condition)
				} else if (value2 === "" || value2 == null) {
					condition = "gte";
					value = getValue(value, dataType, condition)
				} else {
					value = getValue(value, dataType, condition);
					value2 = getValue(value2, dataType, condition)
				}
			} else if (condition == "regexp") {
				if (location == "remote") {
					value = value.toString()
				} else if (pq.isStr(value)) {
					try {
						var modifiers = filter.modifiers || "gi";
						value = new RegExp(value, modifiers)
					} catch (ex) {
						value = /.*/
					}
				}
			} else if (condition == "range" || $.isArray(value)) {
				if (value == null) {
					return
				} else {
					if (pq.isFn(value.push)) {
						if (value.length === 0) {
							return
						} else if (condition != "range") {
							value = getValue(value[0], dataType, condition)
						} else {
							value = value.slice();
							for (var j = 0, len = value.length; j < len; j++) {
								value[j] = getValue(value[j], dataType, condition)
							}
						}
					}
				}
			} else if (condition) {
				value = getValue(value, dataType, condition);
				if (value2 != null) value2 = getValue(value2, dataType, condition)
			}
			var cbFn;
			if (location == "remote") {
				cbFn = ""
			} else {
				cbFn = ((filter.conditions || {})[condition] || {}).compare || pq.filter.conditions[condition].compare || cFilterData.conditions[condition]
			}
			return [value, value2, cbFn, condition]
		},
		getRulesFromCM: function(objP) {
			var CM = objP.CM;
			if (!CM) {
				throw "CM N/A"
			}
			var self = this,
				CMLength = CM.length,
				i = 0,
				location = objP.location,
				isRemote = location === "remote",
				rules = [],
				cFilterData = _pq.cFilterData,
				getValue = function(cd, dataType, condition) {
					if (isRemote) {
						cd = cd == null ? "" : cd;
						return cd.toString()
					} else {
						return cFilterData.convertEx(cd, dataType, condition)
					}
				};
			for (; i < CMLength; i++) {
				var column = CM[i],
					filter = column.filter;
				if (filter) {
					var dataIndx = column.dataIndx,
						dataType = column.dataType,
						rulesC = filter.crules || [filter],
						newRulesC = [],
						ruleobj, value, value2, condition, cbFn, arr;
					dataType = !dataType || dataType == "stringi" || pq.isFn(dataType) ? "string" : dataType;
					rulesC.forEach(function(rule) {
						condition = rule.condition;
						value = rule.value;
						value2 = rule.value2;
						if (condition && self.isCorrect(condition, value, value2) && (arr = self._getRulesFromCM(location, filter, condition, value, value2, dataType, getValue))) {
							value = arr[0];
							value2 = arr[1];
							cbFn = arr[2];
							newRulesC.push({
								condition: arr[3],
								value: value,
								value2: value2,
								cbFn: cbFn
							})
						}
					});
					if (newRulesC.length) {
						ruleobj = {
							dataIndx: dataIndx,
							dataType: dataType,
							format: column.formatRaw
						};
						if (isRemote && newRulesC.length == 1) {
							ruleobj.value = newRulesC[0].value;
							ruleobj.value2 = newRulesC[0].value2;
							ruleobj.condition = newRulesC[0].condition
						} else {
							ruleobj.crules = newRulesC;
							ruleobj.mode = filter.mode;
							if (!isRemote) ruleobj.column = column
						}
						rules.push(ruleobj)
					}
				}
			}
			if (objP.apply || isRemote) {
				this.sortRulesAndFMIndx(rules)
			}
			return rules
		},
		getCMFromRules: function(rules) {
			var that = this.that;
			return rules.map(function(rule) {
				var col = that.getColumn({
					dataIndx: rule.dataIndx
				});
				return pq.copyObj({}, col, ["parent"])
			})
		},
		getQueryStringFilter: function() {
			var that = this.that,
				o = that.options,
				stringify = o.stringify,
				FM = o.filterModel,
				FMmode = FM.mode,
				CM = that.colModel,
				newDI = FM.newDI || [],
				rules = this.getRulesFromCM({
					CM: CM,
					location: "remote"
				}),
				obj, filter = "";
			if (FM && FM.on && rules) {
				if (rules.length) {
					var frFn = (rule, valStr) => {
						var formatRaw = rule.format,
							val = rule[valStr];
						rule[valStr] = val && formatRaw ? pq.formatDate(val, formatRaw) : val
					};
					rules.forEach(rule => {
						if (rule.dataType == "date") {
							frFn(rule, "value");
							frFn(rule, "value2")
						}
					});
					obj = {
						mode: FMmode,
						data: rules
					};
					filter = stringify ? JSON.stringify(obj) : obj
				} else {
					filter = "";
					if (newDI.length) {
						that._trigger("clearFilter")
					}
				}
			}
			return filter
		},
		isCorrect: function(condition, value, value2) {
			var conditions = pq.filter.conditions,
				obj = conditions[condition];
			if (obj) {
				if ((value == null || value === "") && (value2 == null || value2 === "")) {
					if (!obj.nr) {
						return false
					}
				}
				return true
			} else {
				throw "filter condition NA"
			}
		},
		isMatchCell: function(s, rowData) {
			var dataIndx = s.dataIndx,
				that = this.that,
				column = s.column,
				dataType = s.dataType,
				value, value2, condition, cbFn, mode = s.mode,
				found = [],
				find, rules = s.crules,
				rule, len = rules.length,
				cd = rowData[dataIndx],
				cd2;
			for (var i = 0; i < len; i++) {
				rule = rules[i];
				condition = rule.condition;
				value = rule.value;
				value2 = rule.value2;
				cbFn = rule.cbFn;
				if (condition) {
					if (condition === "regexp") {
						cd2 = cd == null ? "" : cd
					}
					cd2 = cFilterData.convertEx(cd, dataType, condition, column, that);
					found.push(cbFn.call(that, cd2, value, value2, rowData, column) ? true : false)
				}
			}
			len = found.length;
			if (mode === "AND") {
				for (i = 0; i < len; i++) {
					find = found[i];
					if (!find) {
						return false
					}
				}
				return true
			} else {
				for (i = 0; i < len; i++) {
					find = found[i];
					if (find) {
						return true
					}
				}
				return false
			}
		},
		isMatchRow: function(rowData, rules, FMmode) {
			var i = 0,
				len = rules.length,
				rule, found, isAND = FMmode == "AND",
				isOR = !isAND;
			if (len == 0) {
				return true
			}
			for (; i < len; i++) {
				rule = rules[i];
				found = this.isMatchCell(rule, rowData);
				if (found) rule.found = true;
				if (isOR && found) {
					return true
				}
				if (isAND && !found) {
					return false
				}
			}
			return isAND
		},
		onFilterChange: function() {
			var that = this.that,
				o = that.options,
				FM = o.filterModel,
				isRemote = FM.type == "remote",
				oldDI = FM.oldDI || [],
				noRows = !o.dataModel.data.length,
				hc = that.headerCells,
				cls = "pq-col-filtered",
				takeAllRules = isRemote || noRows,
				addRemove = function(fn, di) {
					var ci = that.getColIndx({
							dataIndx: di
						}),
						i = 0;
					for (; i <= 1; i++) {
						that[fn]({
							ri: hc.length - i,
							colIndx: ci,
							cls: cls
						})
					}
				},
				dis = (FM.rules || []).reduce(function(arr, rule) {
					if (rule.found || takeAllRules) {
						arr.push(rule.dataIndx)
					}
					return arr
				}, []);
			oldDI.forEach(function(di) {
				addRemove("removeClassHead", di)
			});
			dis.forEach(function(di) {
				addRemove("addClassHead", di)
			});
			FM.oldDI = FM.newDI = dis
		},
		onLoad: function() {
			var dataUF = this.that.options.dataModel.dataUF;
			if (dataUF) {
				dataUF.length = 0
			}
		},
		sortRulesAndFMIndx: function(rules) {
			var FM = this.that.options.filterModel,
				newDI = FM.newDI;
			rules.sort(function(a, b) {
				var di1 = a.dataIndx,
					di2 = b.dataIndx,
					i1 = newDI.indexOf(di1),
					i2 = newDI.indexOf(di2);
				if (i1 >= 0 && i2 >= 0) {
					return i1 - i2
				} else if (i1 >= 0) {
					return -1
				} else if (i2 >= 0) {
					return 1
				} else {
					return 0
				}
			});
			FM.rules = rules
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cSort = _pq.cSort = function(that) {
			var self = this;
			self.that = that;
			self.sorters = [];
			self.tmpPrefix = "pq_tmp_";
			self.cancel = false
		};
	_pq.pqGrid.prototype.sort = function(ui) {
		ui = ui || {};
		if (ui.data) {
			return this.iSort._sortLocalData(ui.sorter, ui.data)
		}
		var that = this,
			options = that.options,
			DM = options.dataModel,
			data = DM.data,
			location = DM.location,
			SM = options.sortModel,
			type = SM.type;
		if ((!data || !data.length) && type == "local") {
			return
		}
		var EM = options.editModel,
			iSort = that.iSort,
			oldSorter = iSort.getSorter(),
			newSorter, evt = ui.evt,
			single = ui.single == null ? iSort.readSingle() : ui.single,
			cancel = iSort.readCancel();
		if (ui.sorter) {
			if (ui.addon) {
				ui.single = single;
				ui.cancel = cancel;
				newSorter = iSort.addon(ui)
			} else {
				newSorter = ui.sorter
			}
		} else {
			newSorter = iSort.readSorter()
		}
		if (!newSorter.length && !oldSorter.length) {
			return
		}
		if (EM.indices) {
			that.blurEditor({
				force: true
			})
		}
		var ui2 = {
			dataIndx: newSorter.length ? newSorter[0].dataIndx : null,
			oldSorter: oldSorter,
			sorter: newSorter,
			source: ui.source,
			single: single
		};
		if (that._trigger("beforeSort", evt, ui2) === false) {
			iSort.cancelSort();
			return
		}
		iSort.resumeSort();
		if (type == "local") {
			iSort.saveOrder()
		}
		iSort.setSorter(newSorter);
		iSort.setSingle(single);
		iSort.writeSorter(newSorter);
		iSort.writeSingle(single);
		if (type == "local") {
			DM.data = iSort.sortLocalData(data, !ui.skipCustomSort, data[0] == that.pdata[0] ? "pq_order" : "pq_gorder");
			that._queueATriggers.sort = {
				evt: evt,
				ui: ui2
			};
			if (ui.refresh !== false) {
				that.refreshView()
			}
		} else if (type == "remote") {
			that._queueATriggers.sort = {
				evt: evt,
				ui: ui2
			};
			if (!ui.initByRemote) {
				if (that._trigger("customSort") !== false) {
					if (location == "lazy") {
						that.iLazy.init({
							initBySort: true
						})
					} else {
						that.remoteRequest({
							initBySort: true,
							callback: function() {
								that._onDataAvailable()
							}
						})
					}
				}
			}
		}
	};
	cSort.prototype = {
		addon: function(ui) {
			ui = ui || {};
			var sorter = ui.sorter[0],
				uiDataIndx = sorter.dataIndx,
				uiDir = sorter.dir,
				single = ui.single,
				cancel = ui.cancel,
				oldSorters = this.readSorter(),
				oldSorter = oldSorters[0];
			if (single == null) {
				throw "sort single N/A"
			}
			if (uiDataIndx != null) {
				if (single && !ui.tempMultiple) {
					oldSorters = oldSorters.length ? [oldSorters[0]] : [];
					oldSorter = oldSorters[0];
					if (oldSorter && oldSorter.dataIndx == sorter.dataIndx) {
						var oldDir = oldSorter.dir;
						var sortDir = oldDir === "up" ? "down" : cancel && oldDir === "down" ? "" : "up";
						if (sortDir === "") {
							oldSorters.length--
						} else {
							oldSorter.dir = sortDir
						}
					} else {
						sortDir = uiDir || "up";
						oldSorters[0] = $.extend({}, sorter, {
							dir: sortDir
						})
					}
				} else {
					var indx = this.inSorters(oldSorters, uiDataIndx);
					if (indx > -1) {
						oldDir = oldSorters[indx].dir;
						if (oldDir == "up") {
							oldSorters[indx].dir = "down"
						} else if (cancel && oldDir == "down") {
							oldSorters.splice(indx, 1)
						} else if (oldSorters.length == 1) {
							oldSorters[indx].dir = "up"
						} else {
							oldSorters.splice(indx, 1)
						}
					} else {
						oldSorters.push($.extend({}, sorter, {
							dir: "up"
						}))
					}
				}
			}
			return oldSorters
		},
		cancelSort: function() {
			this.cancel = true
		},
		resumeSort: function() {
			this.cancel = false
		},
		readSorter: function() {
			var that = this.that,
				columns = that.columns,
				sorters = (that.options.sortModel.sorter || []).filter(function(sorter) {
					return !!columns[sorter.dataIndx]
				});
			sorters = pq.arrayUnique(sorters, "dataIndx");
			return sorters
		},
		setSingle: function(m) {
			this.single = m
		},
		getSingle: function() {
			return this.single
		},
		readSingle: function() {
			return this.that.options.sortModel.single
		},
		setCancel: function(m) {
			this.cancel = m
		},
		readCancel: function() {
			return this.that.options.sortModel.cancel
		},
		saveOrder: function(di) {
			di = di || "pq_order";
			var that = this.that,
				data, pdata = that.get_p_data(),
				rd = pdata.find(function(_rd) {
					return _rd && !_rd.pq_gtitle && !_rd.pq_gsummary
				});
			if (rd && rd[di] == null || !rd) {
				data = pdata;
				for (var i = 0, len = data.length; i < len; i++) {
					rd = data[i];
					rd && (rd[di] = i)
				}
			}
		},
		getCancel: function() {
			return this.cancel
		},
		getQueryStringSort: function() {
			if (this.cancel) {
				return ""
			}
			var that = this.that,
				sorters = this.sorters,
				options = that.options,
				stringify = options.stringify;
			if (sorters.length) {
				return stringify ? JSON.stringify(sorters) : sorters
			} else {
				return ""
			}
		},
		getSorter: function() {
			return this.sorters
		},
		setSorter: function(sorters) {
			this.sorters = sorters.slice(0)
		},
		inSorters: function(sorters, dataIndx) {
			for (var i = 0; i < sorters.length; i++) {
				if (sorters[i].dataIndx == dataIndx) {
					return i
				}
			}
			return -1
		},
		sortLocalData: function(data, customSort, di) {
			di = di || "pq_order";
			var sorters = this.sorters;
			if (!sorters.length) {
				if (data.length && data[0][di] != null) {
					sorters = [{
						dataIndx: di,
						dir: "up",
						dataType: "integer"
					}]
				}
			}
			return this._sortLocalData(sorters, data, customSort)
		},
		compileSorter: function(sorters, data) {
			var self = this,
				that = self.that,
				columns = that.columns,
				o = that.options,
				arrFn = [],
				arrDI = [],
				arrDir = [],
				tmpPrefix = self.tmpPrefix,
				SM = o.sortModel,
				o_useCache = SM.useCache,
				ignoreCase = SM.ignoreCase,
				sortersLength = sorters.length;
			data = data || o.dataModel.data;
			for (var i = 0; i < sortersLength; i++) {
				var sorter = sorters[i],
					dataIndx = sorter.sortIndx || sorter.dataIndx,
					column = columns[dataIndx] || {},
					_dir = sorter.dir = sorter.dir || "up",
					dir = _dir == "up" ? 1 : -1,
					sortType = pq.getFn(column.sortType),
					dataType = column.dataType || sorter.dataType || "string",
					dataType = dataType == "string" && ignoreCase ? "stringi" : dataType,
					useCache = o_useCache && dataType == "date",
					_dataIndx = useCache ? tmpPrefix + dataIndx : dataIndx;
				arrDI[i] = _dataIndx;
				arrDir[i] = dir;
				if (sortType) {
					arrFn[i] = function(sortType, sort_custom) {
						return function(obj1, obj2, dataIndx, dir) {
							return sort_custom(obj1, obj2, dataIndx, dir, sortType)
						}
					}(sortType, sortObj.sort_sortType)
				} else if (dataType == "integer") {
					arrFn[i] = sortObj.sort_number
				} else if (dataType == "float") {
					arrFn[i] = sortObj.sort_number
				} else if (pq.isFn(dataType)) {
					arrFn[i] = function(dataType, sort_custom) {
						return function(obj1, obj2, dataIndx, dir) {
							return sort_custom(obj1, obj2, dataIndx, dir, dataType)
						}
					}(dataType, sortObj.sort_dataType)
				} else if (dataType == "date") {
					arrFn[i] = sortObj["sort_date" + (useCache ? "_fast" : "")]
				} else if (dataType == "bool") {
					arrFn[i] = sortObj.sort_bool
				} else if (dataType == "stringi") {
					arrFn[i] = sortObj.sort_locale
				} else {
					arrFn[i] = sortObj.sort_string
				}
				if (useCache) {
					self.addCache(data, dataType, dataIndx, _dataIndx)
				}
			}
			return self._composite(arrFn, arrDI, arrDir, sortersLength)
		},
		_composite: function(arrFn, arrDI, arrDir, len) {
			return function sort_composite(obj1, obj2) {
				var ret = 0,
					i = 0;
				for (; i < len; i++) {
					ret = arrFn[i](obj1, obj2, arrDI[i], arrDir[i]);
					if (ret != 0) {
						break
					}
				}
				return ret
			}
		},
		_sortLocalData: function(sorters, data, useCustomSort) {
			if (!data) {
				return []
			}
			if (!data.length) {
				return data
			}
			var self = this,
				that = self.that,
				SM = that.options.sortModel,
				sort_composite = self.compileSorter(sorters, data),
				ui = {
					sort_composite: sort_composite,
					data: data,
					sorter: sorters
				};
			if (!sorters || !sorters.length) {
				that._trigger("cancelSort", null, ui)
			} else {
				if (useCustomSort && that._trigger("customSort", null, ui) === false) {
					data = ui.data
				} else {
					data.sort(sort_composite)
				}
				if (SM.useCache) {
					self.removeCache(sorters, data)()
				}
			}
			return data
		},
		addCache: function(data, dataType, dataIndx, _dataIndx) {
			var valueFn = sortObj["get_" + dataType],
				j = data.length;
			while (j--) {
				var rowData = data[j];
				rowData[_dataIndx] = valueFn(rowData[dataIndx])
			}
		},
		removeCache: function(sorters, data) {
			var tmpPrefix = this.tmpPrefix;
			return function() {
				var i = sorters.length;
				while (i--) {
					var sorter = sorters[i],
						_dataIndx = tmpPrefix + sorter.dataIndx,
						j = data.length;
					if (j && data[0].hasOwnProperty(_dataIndx)) {
						while (j--) {
							delete data[j][_dataIndx]
						}
					}
				}
			}
		},
		writeCancel: function(m) {
			this.that.options.sortModel.cancel = m
		},
		writeSingle: function(m) {
			this.that.options.sortModel.single = m
		},
		writeSorter: function(sorter) {
			var o = this.that.options,
				SM = o.sortModel;
			SM.sorter = sorter
		}
	};
	var sortObj = {
		get_date: function(val) {
			var val2;
			return val ? isNaN(val2 = Date.parse(val)) ? 0 : val2 : 0
		},
		sort_number: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			val1 = val1 ? val1 * 1 : 0;
			val2 = val2 ? val2 * 1 : 0;
			return (val1 - val2) * dir
		},
		sort_date: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			val1 = val1 ? Date.parse(val1) : 0;
			val2 = val2 ? Date.parse(val2) : 0;
			return (val1 - val2) * dir
		},
		sort_date_fast: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			return (val1 - val2) * dir
		},
		sort_dataType: function(obj1, obj2, dataIndx, dir, dataType) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx];
			return dataType(val1, val2) * dir
		},
		sort_sortType: function(obj1, obj2, dataIndx, dir, sortType) {
			return sortType(obj1, obj2, dataIndx) * dir
		},
		sort_string: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx] || "",
				val2 = obj2[dataIndx] || "",
				ret = 0;
			if (val1 > val2) {
				ret = 1
			} else if (val1 < val2) {
				ret = -1
			}
			return ret * dir
		},
		sort_locale: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx] || "",
				val2 = obj2[dataIndx] || "";
			return val1.localeCompare(val2) * dir
		},
		sort_bool: function(obj1, obj2, dataIndx, dir) {
			var val1 = obj1[dataIndx],
				val2 = obj2[dataIndx],
				ret = 0;
			if (val1 && !val2 || val1 === false && val2 == null) {
				ret = 1
			} else if (val2 && !val1 || val2 === false && val1 == null) {
				ret = -1
			}
			return ret * dir
		}
	};
	pq.sortObj = sortObj
})(jQuery);
(function($) {
	function cMerge(that) {
		var self = this;
		self.that = that;
		self.mc = null;
		that.on("dataReadyDone colMove groupShowHide hideCols", function(evt, ui) {
			if (that.options.mergeCells && ui.source !== "pager") {
				self.init()
			}
		});
		that.on("colAdd colRemove", self.alterColumn.bind(self)).on("change", self.onChange.bind(self));
		that.Merge = function() {
			return self
		}
	}
	$.paramquery.cMerge = cMerge;
	cMerge.prototype = {
		auto: function(arr, mc) {
			var that = this.that,
				data = that.pdata;
			mc = mc || [];
			arr.forEach(function(dataIndx) {
				var rc = 1,
					ci = that.colIndxs[dataIndx],
					j = data.length;
				while (j--) {
					var cd = data[j][dataIndx],
						cd_prev = data[j - 1] ? data[j - 1][dataIndx] : undefined;
					if (cd_prev !== undefined && cd == cd_prev) {
						rc++
					} else if (rc > 1) {
						mc.push({
							r1: j,
							c1: ci,
							rc: rc,
							cc: 1
						});
						rc = 1
					}
				}
			});
			return mc
		},
		calcVisibleColumns: function(CM, ci1, ci2, skip) {
			var num = 0,
				len = CM.length;
			ci2 = ci2 > len ? len : ci2;
			for (; ci1 < ci2; ci1++) {
				if (!skip(CM[ci1])) {
					num++
				}
			}
			return num
		},
		calcVisibleRows: function(pdata, rip1, rip2, skipR) {
			var num = 0,
				i = rip1,
				len = pdata.length;
			rip2 = rip2 > len ? len : rip2;
			for (; i < rip2; i++) {
				if (!skipR(pdata[i])) {
					num++
				}
			}
			return num
		},
		findNextVisibleColumn: function(CM, ci, cs, skip) {
			var i = ci,
				column;
			for (; i < ci + cs; i++) {
				column = CM[i];
				if (!column) {
					return -1
				}
				if (!skip(column)) {
					return i
				}
			}
		},
		findNextVisibleRow: function(pdata, rip, rs, skipR) {
			var i = rip,
				rowdata;
			for (; i < rip + rs; i++) {
				rowdata = pdata[i];
				if (!rowdata) {
					return -1
				}
				if (!skipR(rowdata)) {
					return i
				}
			}
		},
		getData: function(ri, ci, key) {
			var mcRec, mc = this.mc;
			if (mc[ri] && (mcRec = mc[ri][ci])) {
				var data = mcRec.data;
				return data ? data[key] : null
			}
		},
		inflateRange: function(r1, c1, r2, c2) {
			var that = this.that,
				expand = false,
				max_ri2 = that.riOffset + that.pdata.length - 1,
				max_ci2 = that.colModel.length - 1,
				mc = this.mc2;
			if (!mc) {
				return [r1, c1, r2, c2]
			}
			expando: for (var i = 0, len = mc.length; i < len; i++) {
				var rec = mc[i],
					ri1 = rec.r1,
					ci1 = rec.c1,
					ri2 = ri1 + rec.rc - 1,
					ci2 = ci1 + rec.cc - 1,
					ri2 = ri2 > max_ri2 ? max_ri2 : ri2,
					ci2 = ci2 > max_ci2 ? max_ci2 : ci2,
					topEdge = ri1 < r1 && ri2 >= r1,
					botEdge = ri1 <= r2 && ri2 > r2,
					leftEdge = ci1 < c1 && ci2 >= c1,
					rightEdge = ci1 <= c2 && ci2 > c2;
				if ((topEdge || botEdge) && ci2 >= c1 && ci1 <= c2 || (leftEdge || rightEdge) && ri2 >= r1 && ri1 <= r2) {
					expand = true;
					r1 = ri1 < r1 ? ri1 : r1;
					c1 = ci1 < c1 ? ci1 : c1;
					r2 = ri2 > r2 ? ri2 : r2;
					c2 = ci2 > c2 ? ci2 : c2;
					break expando
				}
			}
			if (expand) {
				return this.inflateRange(r1, c1, r2, c2)
			} else {
				return [r1, c1, r2, c2]
			}
		},
		init: function(skipC, skipR) {
			var self = this,
				that = self.that,
				CM = that.colModel,
				mc_o = that.options.mergeCells || [],
				data = that.get_p_data(),
				arr2 = [],
				arr = [];
			skipC = skipC || function(col) {
				return col.hidden
			};
			skipR = skipR || function(rd) {
				return rd.pq_hidden
			};
			for (var i = 0, len = mc_o.length; i < len; i++) {
				var rec = mc_o[i],
					r1 = rec.r1,
					v_r1 = r1,
					rowdata = data[r1],
					c1 = rec.c1,
					v_c1 = c1,
					column = CM[c1],
					rs = rec.rc,
					cs = rec.cc,
					cs2, rs2;
				if (!column || !rowdata) {
					continue
				}
				if (skipC(column)) {
					v_c1 = self.findNextVisibleColumn(CM, c1, cs, skipC)
				}
				cs2 = self.calcVisibleColumns(CM, c1, c1 + cs, skipC);
				if (skipR(rowdata)) {
					v_r1 = self.findNextVisibleRow(data, r1, rs, skipR)
				}
				rs2 = self.calcVisibleRows(data, r1, r1 + rs, skipR);
				if (rs2 < 1 || cs2 < 1) {
					continue
				}
				arr2.push({
					r1: r1,
					c1: c1,
					rc: rs,
					cc: cs
				});
				arr[v_r1] = arr[v_r1] || [];
				arr[v_r1][v_c1] = {
					show: true,
					rowspan: rs2,
					colspan: cs2,
					o_rowspan: rs,
					o_colspan: cs,
					style: rec.style,
					cls: rec.cls,
					attr: rec.attr,
					r1: r1,
					c1: c1,
					v_r1: v_r1,
					v_c1: v_c1
				};
				var hidden_obj = {
					show: false,
					r1: r1,
					c1: c1,
					v_r1: v_r1,
					v_c1: v_c1
				};
				for (var j = r1; j < r1 + rs; j++) {
					arr[j] = arr[j] || [];
					for (var k = c1; k < c1 + cs; k++) {
						if (j == v_r1 && k == v_c1) {
							continue
						}
						arr[j][k] = hidden_obj
					}
				}
			}
			that._mergeCells = arr.length > 0;
			self.mc = arr;
			self.mc2 = arr2
		},
		ismergedCell: function(ri, ci) {
			var mc = this.mc,
				mcRec;
			if (mc && mc[ri] && (mcRec = mc[ri][ci])) {
				var v_ri = mcRec.v_r1,
					v_ci = mcRec.v_c1;
				if (ri == v_ri && ci == v_ci) {
					return {
						o_ri: mcRec.r1,
						o_ci: mcRec.c1,
						v_rc: mcRec.rowspan,
						v_cc: mcRec.colspan,
						o_rc: mcRec.o_rowspan,
						o_cc: mcRec.o_colspan
					}
				} else {
					return true
				}
			} else {
				return false
			}
		},
		isRootCell: function(r1, c1, type) {
			var mc = this.mc,
				mcRec;
			if (mc && mc[r1] && (mcRec = mc[r1][c1])) {
				if (type == "o") {
					return r1 == mcRec.r1 && c1 == mcRec.c1
				}
				var v_r1 = mcRec.v_r1,
					v_c1 = mcRec.v_c1;
				if (v_r1 == r1 && v_c1 == c1) {
					var mcRoot = mc[v_r1][v_c1];
					return {
						rowspan: mcRoot.rowspan,
						colspan: mcRoot.colspan
					}
				}
			}
		},
		removeData: function(ri, ci, key) {
			var that = this.that,
				mcRec, mc = this.mc;
			if (mc && mc[ri] && (mcRec = mc[ri][ci])) {
				var data = mcRec.data;
				if (data) {
					data[key] = null
				}
			}
		},
		getRootCell: function(r1, ci) {
			var mc = this.mc,
				v_ri, v_ci, mcRec;
			if (mc && mc[r1] && (mcRec = mc[r1][ci])) {
				v_ri = mcRec.v_r1;
				v_ci = mcRec.v_c1;
				mcRec = mc[v_ri][v_ci];
				return {
					o_ri: mcRec.r1,
					o_ci: mcRec.c1,
					v_ri: v_ri,
					v_ci: v_ci,
					v_rc: mcRec.rowspan,
					v_cc: mcRec.colspan,
					o_rc: mcRec.o_rowspan,
					o_cc: mcRec.o_colspan
				}
			}
		},
		getRootCellO: function(ri, ci, always, type) {
			type = type || "o";
			var o = type == "o",
				obj = this.getRootCell(ri, ci),
				ui;
			if (obj) {
				ui = {
					rowIndx: obj[o ? "o_ri" : "v_ri"],
					colIndx: obj[o ? "o_ci" : "v_ci"]
				};
				return this.that.normalize(ui)
			} else if (always) {
				ui = {
					rowIndx: ri,
					colIndx: ci
				}
			}
			return ui ? this.that.normalize(ui) : null
		},
		getRootCellV: function(ri, ci, always) {
			return this.getRootCellO(ri, ci, always, "v")
		},
		getClsStyle: function(v_ri, v_ci) {
			return this.mc[v_ri][v_ci]
		},
		getMergeCells: function(curPage, dataLen) {
			var that = this.that,
				mcarr = this.mc2,
				mc, r1, c1, offset = that.riOffset,
				offset2 = offset + dataLen,
				arr = [],
				mcLen = mcarr ? mcarr.length : 0,
				i = 0;
			for (; i < mcLen; i++) {
				mc = mcarr[i];
				r1 = mc.r1;
				c1 = mc.c1;
				if (!curPage || r1 >= offset && r1 < offset2) {
					if (curPage) {
						r1 -= offset
					}
					arr.push({
						r1: r1,
						c1: c1,
						r2: r1 + mc.rc - 1,
						c2: c1 + mc.cc - 1
					})
				}
			}
			return arr
		},
		alterColumn: function(evt, ui) {
			var o = this.that.options,
				args = ui.args,
				ci = args[1],
				n = args[0],
				add = typeof n != "number",
				n = add ? n.length : n,
				mc = o.mergeCells || [],
				j = 0,
				mlen = mc.length;
			for (; j < mlen; j++) {
				var mcR = mc[j],
					c1 = mcR.c1,
					cc = mcR.cc;
				if (add) {
					if (c1 >= ci) mcR.c1 = c1 + n;
					else if (c1 + cc > ci) mcR.cc = cc + n
				} else {
					if (c1 > ci) mcR.c1 = c1 - n;
					else if (c1 + cc > ci && cc - n > 0) {
						mcR.cc = cc - n
					}
				}
				mcR.c2 = null
			}
			this.init()
		},
		onChange: function(evt, ui) {
			var o = this.that.options,
				addList = ui.addList,
				deleteList = ui.deleteList,
				mc = o.mergeCells || [],
				ri;
			for (var j = 0, mlen = mc.length; j < mlen; j++) {
				var mcR = mc[j],
					r1 = mcR.r1,
					rc = mcR.rc;
				for (var i = 0, len = addList.length; i < len; i++) {
					ri = addList[i].rowIndx;
					if (r1 >= ri) {
						r1 = mcR.r1 = r1 + 1;
						mcR.r2 = null
					} else if (r1 + rc > ri) {
						rc = mcR.rc = rc + 1;
						mcR.r2 = null
					}
				}
				for (var i = 0, len = deleteList.length; i < len; i++) {
					ri = deleteList[i].rowIndx;
					if (r1 > ri) {
						r1 = mcR.r1 = r1 - 1;
						mcR.r2 = null
					} else if (r1 + rc > ri && rc > 1) {
						rc = mcR.rc = rc - 1;
						mcR.r2 = null
					}
				}
			}
			this.init()
		},
		setData: function(ri, ci, data) {
			var mcRec, mc = this.mc;
			if (mc[ri] && (mcRec = mc[ri][ci])) {
				mcRec.data = data
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		mixin = pq.mixin;
	_pq.pqGrid.defaults.groupModel = {
		cascade: true,
		cbId: "pq_group_cb",
		collapsed: [],
		dataIndx: [],
		fixCols: true,
		groupCols: [],
		header: true,
		headerMenu: true,
		icon: ["ui-icon-triangle-1-se", "ui-icon-triangle-1-e"],
		id: "pq_gid",
		parentId: "parentId",
		childstr: "children",
		menuItems: ["merge", "fixCols", "grandSummary"],
		on: false,
		refreshOnChange: true,
		pivotColsTotal: "after",
		separator: "_",
		source: "checkboxGroup",
		showSummary: [],
		summaryInTitleRow: "collapsed",
		summaryEdit: true,
		title: [],
		titleDefault: "{0} ({1})"
	};
	pq.aggregate = {
		sum: function(arr) {
			var s = 0,
				i = arr.length,
				val;
			while (i--) {
				val = arr[i];
				if (val != null) {
					s += val - 0
				}
			}
			return s
		},
		avg: function(arr, column) {
			try {
				var avg = pq.formulas.AVERAGE(arr)
			} catch (ex) {
				avg = ex
			}
			return isNaN(avg) ? null : avg
		},
		flatten: function(arr) {
			return arr.filter(function(val) {
				return val != null
			})
		},
		max: function(arr, column) {
			var len, max, temp, val, valDate, dataType = pq.getDataType(column);
			arr = this.flatten(arr);
			len = arr.length;
			if (len) {
				if (dataType == "number") {
					max = arr[0] * 1;
					while (len--) {
						temp = arr[len];
						max = temp > max || isNaN(max) ? temp : max
					}
				} else if (dataType == "date") {
					max = Date.parse(arr[0]);
					val = arr[0];
					while (len--) {
						valDate = Date.parse(arr[len]);
						if (valDate > max || isNaN(max)) {
							max = valDate;
							val = arr[len]
						}
					}
					max = val
				} else {
					arr.sort();
					max = arr[len - 1]
				}
				return max
			}
		},
		min: function(arr, column) {
			var min, temp, val, len, dataType = pq.getDataType(column);
			arr = this.flatten(arr);
			len = arr.length;
			if (len) {
				if (dataType == "number") {
					min = arr[0] * 1;
					while (len--) {
						temp = arr[len] * 1;
						min = temp < min || isNaN(min) ? temp : min
					}
				} else if (dataType == "date") {
					min = Date.parse(arr[0]);
					val = arr[0];
					while (len--) {
						temp = Date.parse(arr[len]);
						if (temp < min || isNaN(min)) {
							min = temp;
							val = arr[len]
						}
					}
					min = val
				} else {
					arr.sort();
					min = arr[0]
				}
				return min
			}
		},
		count: function(arr) {
			return this.flatten(arr).length
		},
		stdev: function(arr) {
			try {
				var v = pq.formulas.STDEV(arr)
			} catch (ex) {
				v = ex
			}
			return isNaN(v) ? null : v
		},
		stdevp: function(arr) {
			try {
				var v = pq.formulas.STDEVP(arr)
			} catch (ex) {
				v = ex
			}
			return isNaN(v) ? null : v
		}
	};
	var cGroup = _pq.cGroup = function(that) {
		var self = this,
			o = that.options,
			GM = self.Model = o.groupModel;
		self.cbId = GM.cbId;
		self.childstr = GM.childstr;
		self.id = GM.id;
		self.parentId = GM.parentId;
		self.isGroup = true;
		self.cache = {};
		self.oldEditor = o.editor;
		self.prop = "pq_group_prop";
		self.that = that;
		Object.defineProperty(GM, "nodeClose", {
			get: function() {
				return self.fillState({})
			},
			set: function(obj) {
				self.nodeClose = obj
			}
		});
		that.one("CMInit", function() {
			self.addAggGetter(GM)
		});
		if (GM.on) self.init()
	};
	cGroup.beforeTrigger = function(evt, that) {
		return function(state) {
			return that._trigger("beforeGroupExpand", evt, state) === false
		}
	};
	cGroup.onGroupItemClick = function(self) {
		return function(evt) {
			var $target = $(evt.target),
				dataIndx = $(this).data("indx");
			if ($target.hasClass("pq-group-remove")) {
				self.removeGroup(dataIndx)
			} else {
				self.toggleLevel(dataIndx, evt)
			}
		}
	};

	function tmpl(arr, GM, option, o) {
		arr.push("<li data-option='", option, "' class='pq-menu-item'>", "<label>", "<input type='checkbox' ", GM[option] ? "checked" : "", "/>", o["strGroup_" + option], "</label></li>")
	}
	cGroup.prototype = $.extend({}, mixin.ChkGrpTree, mixin.GrpTree, {
		addAggGetter: function(GM) {
			var _agg = GM.agg,
				self = this;
			Object.defineProperty(GM, "agg", {
				get: function() {
					var obj = {},
						sum;
					self.getCMPrimary().forEach(function(col) {
						sum = col.summary;
						if (sum && sum.type) {
							obj[col.dataIndx] = sum.type
						}
					});
					return obj
				},
				set: function(obj) {
					self.getCMPrimary().forEach(function(col) {
						var di = col.dataIndx,
							type = obj[di],
							sum;
						if (type)(col.summary = col.summary || {}).type = type;
						else if (sum = col.summary) delete sum.type
					})
				}
			});
			if (_agg) GM.agg = _agg
		},
		addGroup: function(dataIndx, indx) {
			var self = this,
				that = self.that,
				GMDI = that.options.groupModel.dataIndx || [],
				obj = pq.objectify(GMDI),
				arr = GMDI.slice();
			if (dataIndx != null && !obj[dataIndx]) {
				if (indx == null) arr.push(dataIndx);
				else arr.splice(indx, 0, dataIndx);
				self.option({
					dataIndx: arr
				}, "", "", function() {
					self.triggerChange()
				})
			}
		},
		createHeader: function() {
			var self = this,
				that = self.that,
				$h = self.$header,
				o = that.options,
				columns = that.columns,
				GM = o.groupModel,
				GMdataIndx = GM.dataIndx,
				len = GMdataIndx.length;
			while (len--) {
				if (columns[GMdataIndx[len]] == null) {
					GMdataIndx.splice(len, 1)
				}
			}
			len = GMdataIndx.length;
			if (GM.header && GM.on) {
				if ($h) {
					$h.empty()
				} else {
					$h = self.$header = $("<div class='pq-group-header ui-helper-clearfix' ></div>").appendTo(that.$top);
					$h.on("click", ".pq-group-item", cGroup.onGroupItemClick(self))
				}
				if (len) {
					var arr = [];
					for (var i = 0; i < len; i++) {
						var dataIndx = GMdataIndx[i],
							column = columns[dataIndx],
							collapsed = GM.collapsed,
							icon = GM.icon,
							cicon = collapsed[i] ? icon[1] : icon[0];
						arr.push("<div tabindex='0' class='pq-group-item' data-indx='", dataIndx, "' >", "<span class='", self.toggleIcon, cicon, "' ></span>", column.pq_title || (typeof column.title == "string" ? column.title : dataIndx), "<span class='", self.groupRemoveIcon, "' ></span></div>")
					}
					$h[0].innerHTML = arr.join("")
				}
				self.initHeader(o, GM)
			} else if ($h) {
				$h.remove();
				self.$header = null
			}
		},
		collapse: function(level) {
			this.expand(level, true)
		},
		collapseAll: function(level) {
			this.expandAll(level, true)
		},
		collapseTo: function(address) {
			this.expandTo(address, true)
		},
		concat: function() {
			var parentIdStr = this.parentId,
				idstr = this.id,
				childstr = this.childstr;
			return function concat(ndata, children, titleRow) {
				var id = titleRow[idstr];
				children.forEach(function(rd) {
					rd[parentIdStr] = id;
					ndata.push(rd)
				});
				titleRow[childstr] = children;
				return ndata
			}
		},
		editorSummary: function(o, GM) {
			var self = this,
				oldEditor = self.oldEditor;
			return function(ui) {
				var rd = ui.rowData;
				if (rd.pq_gsummary || rd.pq_gtitle) {
					var _aggr = pq.aggregate,
						column = ui.column,
						csummary = column.summary,
						cs_edit = csummary ? csummary.edit : null,
						inArray = $.inArray,
						dt = column.dataType,
						allow, arr = [""];
					if (inArray(ui.dataIndx, GM.dataIndx) > -1) {
						return false
					}
					if (!GM.summaryEdit && !cs_edit || cs_edit === false) {
						return false
					}
					allow = self.getAggOptions(dt);
					for (var key in _aggr) {
						if (inArray(key, allow) > -1) {
							arr.push(key)
						}
					}
					if (arr.length == 1) {
						return false
					}
					return {
						type: "select",
						prepend: GM.prepend,
						options: GM.options || arr,
						valueIndx: GM.valueIndx,
						labelIndx: GM.labelIndx,
						init: GM.init || self.editorInit,
						getData: GM.getData || self.editorGetData
					}
				} else {
					return typeof oldEditor == "function" ? oldEditor.call(self.that, ui) : oldEditor
				}
			}
		},
		editorInit: function(ui) {
			var summary = ui.column.summary,
				type, GMDI = this.options.groupModel.dataIndx;
			if (!summary) {
				summary = ui.column.summary = {}
			}
			type = summary[GMDI[ui.rowData.pq_level]] || summary.type;
			ui.$cell.find("select").val(type)
		},
		editorGetData: function(ui) {
			var column = ui.column,
				GMDI = this.options.groupModel.dataIndx,
				diLevel = GMDI[ui.rowData.pq_level],
				dt = column.dataType,
				summary = column.summary,
				val = ui.$cell.find("select").val();
			summary[summary[diLevel] ? diLevel : "type"] = val;
			this.one("beforeValidate", function(evt, ui) {
				ui.allowInvalid = true;
				ui.track = false;
				ui.history = false;
				column.dataType = "string";
				this.one(true, "change", function(evt, ui) {
					column.dataType = dt
				})
			});
			return val
		},
		expandTo: function(address, _close) {
			var that = this.that,
				close = !!_close,
				indices = address.split(","),
				len = indices.length,
				childstr = this.childstr,
				node, indx, nodes = this.getRoots(that.pdata),
				i = 0;
			while (i < len) {
				indx = indices[i];
				node = nodes[indx];
				if (node) {
					if (!close) node.pq_close = close;
					nodes = node[childstr];
					i++
				} else {
					break
				}
			}
			if (node) {
				node.pq_close = close;
				if (that._trigger("group", null, {
						node: node,
						close: close
					}) !== false) {
					this.softRefresh()
				}
			}
		},
		expandAll: function(level, close) {
			level = level || 0;
			close = !!close;
			if (this.trigger({
					all: true,
					close: close,
					level: level
				}) !== false) {
				this.that.pdata.forEach(function(rd) {
					if (rd.pq_level >= level) {
						rd.pq_close = close
					}
				});
				this.createHeader();
				this.softRefresh()
			}
		},
		expand: function(level, close) {
			level = level || 0;
			if (this.trigger({
					close: !!close,
					level: level
				}) !== false) {
				this.that.pdata.forEach(function(rd) {
					if (rd.pq_level == level) {
						rd.pq_close = close
					}
				});
				this.createHeader();
				this.softRefresh()
			}
		},
		flattenG: function(columns, group, GM, summary) {
			var self = this,
				GMDataIndx = GM.dataIndx,
				idstr = self.id,
				parentIdStr = self.parentId,
				childstr = self.childstr,
				separator = GM.separator,
				titleIndx = GM.titleIndx,
				concat = self.concat(),
				GMLen = GMDataIndx.length,
				ndata = [];
			return function flattenG(data, _level, parent, titleNest) {
				if (!GMLen) {
					return data
				}
				parent = parent || {};
				var level = _level || 0,
					children = parent[childstr],
					di = GMDataIndx[level],
					collapsed = GM.collapsed[level],
					arr = group(data, di, columns[di]);
				arr.forEach(function(_arr) {
					var titleRow, arr2 = _arr[1],
						title = _arr[0],
						titleNest2 = (titleNest ? titleNest + separator : "") + title,
						items = arr2.length;
					titleRow = {
						pq_gtitle: true,
						pq_level: level,
						pq_close: collapsed,
						pq_items: items
					};
					titleRow[idstr] = titleNest2;
					titleRow[parentIdStr] = parent[idstr];
					titleRow[childstr] = [];
					titleRow[di] = title;
					if (titleIndx) titleRow[titleIndx] = title;
					ndata.push(titleRow);
					children && children.push(titleRow);
					if (level + 1 < GMLen) {
						flattenG(arr2, level + 1, titleRow, titleNest2)
					} else {
						ndata = concat(ndata, arr2, titleRow)
					}
				});
				return ndata
			}
		},
		getAggOptions: function(dt) {
			var o = this.that.options,
				map = o.summaryOptions;
			if (dt == "integer" || dt == "float") {
				dt = "number"
			} else if (dt !== "date") {
				dt = "string"
			}
			return map[dt].split(",")
		},
		getVal: function(ignoreCase) {
			var trim = $.trim;
			return function(rd, dataIndx, column) {
				var val = rd[dataIndx],
					chg = column.groupChange;
				if (chg) {
					chg = pq.getFn(chg);
					return chg(val)
				} else {
					val = trim(val);
					return ignoreCase ? val.toUpperCase() : val
				}
			}
		},
		getSumCols: function() {
			return this._sumCols
		},
		getSumDIs: function() {
			return this._sumDIs
		},
		group: function(getVal) {
			return function group(data, di, column) {
				var obj = {},
					arr = [];
				data.forEach(function(rd) {
					rd.pq_hidden = undefined;
					var title = getVal(rd, di, column),
						indx = obj[title];
					if (indx == null) {
						obj[title] = indx = arr.length;
						arr[indx] = [title, []]
					}
					arr[indx][1].push(rd)
				});
				return arr
			}
		},
		groupData: function(pivot) {
			var self = this,
				that = self.that,
				o = that.options,
				GM = o.groupModel,
				getVal = self.getVal(GM.ignoreCase),
				GMdataIndx = GM.dataIndx,
				pdata = that.pdata,
				columns = that.columns,
				arr = self.setSumCols(GMdataIndx),
				summaryFn = function() {};
			that.pdata = self.flattenG(columns, self.group(getVal), GM, summaryFn)(pdata);
			that._trigger("before" + (pivot ? "Pivot" : "Group") + "Summary");
			self.summaryT(pivot)
		},
		hideRows: function(initIndx, level, GMmerge, GMsummaryInTitleRow) {
			var that = this.that,
				rd, hide = true,
				data = that.pdata;
			for (var i = initIndx, len = data.length; i < len; i++) {
				rd = data[i];
				if (rd.pq_gsummary) {
					if (GMmerge || GMsummaryInTitleRow) {
						if (rd.pq_level >= level) {
							rd.pq_hidden = hide
						}
					} else {
						if (rd.pq_level > level) {
							rd.pq_hidden = hide
						}
					}
				} else if (rd.pq_gtitle) {
					if (rd.pq_level <= level) {
						break
					} else {
						rd.pq_hidden = hide
					}
				} else {
					rd.pq_hidden = hide
				}
			}
		},
		init: function() {
			var self = this,
				o, GM, that;
			self.onCMInit();
			if (!self._init) {
				self.mc = [];
				self.summaryData = [];
				that = self.that;
				o = that.options;
				GM = o.groupModel;
				self.groupRemoveIcon = "pq-group-remove ui-icon ui-icon-close";
				self.toggleIcon = "pq-group-toggle ui-icon ";
				that.on("cellClick", self.onCellClick(self)).on("cellKeyDown", self.onCellKeyDown2(self, GM)).on(true, "cellMouseDown", self.onCellMouseDown()).on("change", self.onChange(self, GM)).on("dataReady", self.onDataReady.bind(self)).on("beforeFilterDone", function() {
					self.saveState()
				}).on("columnDragDone", self.onColumnDrag(self)).on("colMove", self.onColMove.bind(self)).on("customSort cancelSort", self.onCustomSort.bind(self)).on("valChange", self.onCheckbox(self, GM)).on("refresh refreshRow", self.onRefresh(self, GM)).on("refreshHeader", self.onRefreshHeader.bind(self));
				if (GM.titleIndx || GM.titleInFirstCol) {
					that.on("CMInit", self.onCMInit.bind(self))
				}
				that.on("beforeCheck", self.onBeforeCheck.bind(self));
				self.setCascadeInit(true);
				self._init = true
			}
		},
		initHeadSortable: function() {
			var self = this,
				that = self.that,
				$h = self.$header,
				o = that.options;
			$h.sortable({
				axis: "x",
				distance: 3,
				tolerance: "pointer",
				cancel: ".pq-group-menu",
				stop: self.onSortable(self, o)
			})
		},
		initHeadDroppable: function() {
			var self = this,
				that = self.that,
				$h = self.$header;
			if ($h) {
				$h.droppable({
					accept: function($drag) {
						if (that.$head_i[0] == $drag[0]) {
							var dis = that.options.groupModel.dataIndx,
								di = that.iDragColumns.columnDrag.dataIndx;
							if (dis.indexOf(di) == -1) {
								return self.acceptDrop
							}
						}
					},
					tolerance: "pointer",
					drop: self.onDrop(that, self)
				});
				self.acceptDrop = true
			}
		},
		initHeader: function(o, GM) {
			var self = this;
			if (self.$header) {
				var $h = self.$header,
					$items = $h.find(".pq-group-item");
				if ($h.data("uiSortable")) {} else {
					self.initHeadSortable()
				}
				if (!$items.length) {
					$h.append("<span class='pq-group-placeholder'>" + o.strGroup_header + "</span>")
				}
				if (GM.headerMenu) {
					self.initHeaderMenu()
				}
			}
		},
		initHeaderMenu: function() {
			var self = this,
				that = self.that,
				o = that.options,
				$h = self.$header,
				arr = ["<ul class='pq-group-menu'><li>", "<div><span>&nbsp;</span></div>", "<ul>"],
				GM = o.groupModel,
				menuItems = GM.menuItems,
				i = 0,
				len = menuItems.length,
				$menu;
			for (; i < len; i++) {
				tmpl(arr, GM, menuItems[i], o)
			}
			arr.push("</ul></li></ul>");
			$menu = $(arr.join("")).appendTo($h);
			$menu.menu({
				icons: {
					submenu: "ui-icon-gear"
				},
				position: {
					my: "right top",
					at: "left top"
				}
			});
			$menu.change(function(evt) {
				if (evt.target.nodeName == "INPUT") {
					var $target = $(evt.target),
						option = $target.closest("li").data("option"),
						ui = {};
					ui[option] = !o.groupModel[option];
					self.option(ui)
				}
			})
		},
		isOn: function() {
			var m = this.that.options.groupModel;
			return m.on && (m.dataIndx || []).length
		},
		getRC: function(rd) {
			var items = 1,
				self = this;
			(rd[self.childstr] || []).forEach(function(child) {
				items += self.getRC(child)
			});
			return items + (rd.pq_child_sum ? 1 : 0)
		},
		initmerge: function() {
			var self = this,
				that = self.that,
				o = that.options,
				GM = o.groupModel,
				GMmerge = GM.merge,
				summaryInTitleRow = GM.summaryInTitleRow,
				titleIndx = GM.titleIndx,
				items, CMLength = that.colModel.length,
				mc = [],
				GMDI = GM.dataIndx,
				lastLevel = GMDI.length - 1,
				pdata = that.pdata || [];
			if (GM.on) {
				if (GMmerge) {
					GMDI.forEach(function(di, level) {
						pdata.forEach(function(rd) {
							if (rd.pq_gtitle && level == rd.pq_level) {
								items = self.getRC(rd);
								mc.push({
									r1: rd.pq_ri,
									rc: items,
									c1: level,
									cc: 1
								})
							}
						})
					})
				} else if (GMDI.length) {
					pdata.forEach(function(rd) {
						if (rd.pq_gtitle) {
							if (!summaryInTitleRow || !rd.pq_close && summaryInTitleRow === "collapsed") {
								mc.push({
									r1: rd.pq_ri,
									rc: 1,
									c1: titleIndx ? that.colIndxs[titleIndx] : rd.pq_level,
									cc: CMLength
								})
							}
						}
					})
				}
			}
			if (mc.length) {
				self.mc = o.mergeCells = mc;
				that.iMerge.init()
			} else if (self.mc.length) {
				self.mc.length = 0;
				that.iMerge.init()
			}
		},
		initcollapsed: function() {
			var self = this,
				that = self.that,
				GM = that.options.groupModel,
				GMmerge = GM.merge,
				GMsummaryInTitleRow = GM.summaryInTitleRow,
				state = self.nodeClose,
				stateKey, stateClose, pdata = that.pdata,
				idstr = self.id,
				rowData, pq_gtitle, level, collapsed;
			if (pdata) {
				for (var i = 0, len = pdata.length; i < len; i++) {
					rowData = pdata[i];
					pq_gtitle = rowData.pq_gtitle;
					if (pq_gtitle) {
						level = rowData.pq_level;
						collapsed = null;
						if (state) {
							stateKey = rowData[idstr];
							stateClose = state[stateKey];
							if (stateClose != null) {
								delete state[stateKey];
								collapsed = rowData.pq_close = stateClose
							}
						}
						if (collapsed == null) collapsed = rowData.pq_close;
						if (collapsed) self.hideRows(i + 1, level, GMmerge, GMsummaryInTitleRow);
						else if (GMmerge) rowData.pq_hidden = true
					}
				}
				that._trigger("groupHideRows")
			}
		},
		updateItems: function(arr) {
			var self = this,
				items = 0,
				children, len, childstr = self.childstr;
			(arr || self.that.pdata).forEach(function(rd) {
				if (rd.pq_gtitle) {
					children = rd[childstr];
					len = children.length;
					if (len && children[0][childstr]) {
						rd.pq_items = self.updateItems(children)
					} else {
						rd.pq_items = len
					}
					items += rd.pq_items
				}
			});
			return items
		},
		removeEmptyParent: function(parent) {
			var self = this,
				pdata = self.that.pdata,
				childstr = self.childstr;
			if (!parent[childstr].length) {
				var parentP = self.getParent(parent),
					children = parentP ? parentP[childstr] : pdata,
					indx = children.indexOf(parent);
				children.splice(indx, 1);
				if (parentP) self.removeEmptyParent(parentP)
			}
		},
		addNodes: function(nodes, parentNew, indx) {
			this.moveNodes(nodes, parentNew, indx, true)
		},
		deleteNodes: function(nodes) {
			this.moveNodes(nodes, null, null, null, true)
		},
		moveNodes: function(nodes, parentNew, indx, add, remove) {
			var self = this,
				that = self.that,
				childstr = self.childstr,
				parentOld, hidden = "pq_hidden",
				o = that.options,
				GM = o.groupModel,
				GMDI = GM.dataIndx,
				roots = self.getRoots(),
				dataOld, dataNew = parentNew ? parentNew[childstr] : roots,
				indxOld, data = [],
				parentIdStr = self.parentId,
				nodesUnq = self.getUniqueNodes(nodes),
				i = 0,
				len, node, sibling = dataNew[0],
				childrenLen = dataNew.length;
			indx = indx == null || indx >= childrenLen ? childrenLen : indx;
			len = nodesUnq.length;
			if (len) {
				that._trigger("beforeMoveNode");
				for (; i < len; i++) {
					node = nodesUnq[i];
					if (add) {
						dataNew.splice(indx++, 0, node)
					} else {
						parentOld = self.getParent(node);
						dataOld = parentOld ? parentOld[childstr] : roots;
						indxOld = dataOld.indexOf(node);
						if (remove) {
							dataOld.splice(indxOld, 1)
						} else {
							if (dataOld == dataNew) {
								indx = pq.moveItem(node, dataNew, indxOld, indx)
							} else {
								dataNew.splice(indx++, 0, node);
								dataOld.splice(indxOld, 1)
							}
						}
					}
					if (parentNew && dataOld != dataNew) {
						GMDI.slice(0, parentNew.pq_level + 1).forEach(function(di) {
							if (self.isFolder(node)) self.getChildrenAll(node).forEach(function(node) {
								node[di] = parentNew[di]
							});
							else node[di] = sibling[di]
						});
						node[parentIdStr] = sibling[parentIdStr];
						node[hidden] = sibling[hidden]
					}
				}
				if (dataNew == roots) {
					that.pdata = dataNew
				}
				that.iRefresh.addRT(nodesUnq);
				self.updateItems();
				self.summaryT();
				that.pageData().forEach(function(rd) {
					if (!rd.pq_gtitle && !rd.pq_gsummary) data.push(rd)
				});
				o.dataModel.data = data;
				if (self.isCascade(GM)) {
					self.cascadeInit();
					self.setValCBox()
				}
				that.iRefresh.addRowIndx();
				self.initmerge();
				that._trigger((add ? "add" : remove ? "delete" : "move") + "Node", null, {
					args: arguments
				});
				that.refresh({
					header: false
				})
			}
		},
		onCellClick: function(self) {
			return function(evt, ui) {
				if (ui.rowData.pq_gtitle && $(evt.originalEvent.target).hasClass("pq-group-icon")) {
					if (pq.isCtrl(evt)) {
						var rd = ui.rowData;
						self[rd.pq_close ? "expand" : "collapse"](rd.pq_level)
					} else {
						self.toggleRow(ui.rowIndxPage, evt)
					}
				}
			}
		},
		onCellMouseDown: function() {
			return function(evt, ui) {
				if (ui.rowData.pq_gtitle && $(evt.originalEvent.target).hasClass("pq-group-icon")) {
					evt.preventDefault()
				}
			}
		},
		onCellKeyDown2: function(self, GM) {
			return function(evt, ui) {
				if (self.onCellKeyDown(evt, ui) == false) {
					return false
				}
				if (ui.rowData.pq_gtitle) {
					if ($.inArray(ui.dataIndx, GM.dataIndx) >= 0 && evt.keyCode == $.ui.keyCode.ENTER) {
						self.toggleRow(ui.rowIndxPage, evt);
						return false
					}
				}
			}
		},
		onChange: function(self, GM) {
			return function(evt, ui) {
				if (GM.source == ui.source || ui.source == "checkbox") {} else {
					self.summaryT();
					self.that.refresh()
				}
			}
		},
		onColumnDrag: function(self) {
			return function(evt, ui) {
				var col = ui.column,
					CM = col.colModel;
				if (CM && CM.length || col.groupable === false || col.denyGroup) {
					self.acceptDrop = false
				} else {
					self.initHeadDroppable()
				}
			}
		},
		onCustomSort: function(evt, ui) {
			var self = this,
				that = self.that,
				o = that.options,
				sorterMulti = [],
				GM = o.groupModel,
				GMdi = GM.dataIndx,
				sorter = ui.sorter || [],
				sorterDI = sorter.map(function(_sorter) {
					return _sorter.dataIndx
				}),
				di = sorterDI[0],
				column = that.columns[di],
				indexOfDI = GMdi.indexOf(di);
			if (o.sortModel.type == "remote") {
				return
			}
			if (GM.on && GMdi.length) {
				if (indexOfDI >= 0 && column.groupChange) {
					return
				}
				if (di == "pq_order" || di == "pq_gorder" || sorter.length == 0 || (column.summary || {}).type) {
					return self._delaySort(ui)
				} else {
					var sorter2 = GMdi.map(function(di) {
						var indexS = sorterDI.indexOf(di),
							presentInSorter = indexS >= 0;
						return {
							dataIndx: di,
							dir: presentInSorter ? sorter[indexS].dir : sorter[0].dir
						}
					}).concat(sorter);
					sorter2 = pq.arrayUnique(sorter2, "dataIndx");
					return self._delaySort(ui, function(data) {
						ui.sort_composite = [];

						function sM() {
							if (sorterMulti.length) ui.sort_composite.push(that.iSort.compileSorter(sorterMulti, data));
							sorterMulti = []
						}
						if (GM.titleIndx == di) {
							sorter2.forEach(function(_sorter) {
								if (GMdi.indexOf(_sorter.dataIndx) == -1) sorterMulti.push(_sorter);
								else {
									sM();
									ui.sort_composite.push(that.iSort.compileSorter([_sorter], data))
								}
							});
							sM()
						} else {
							sorter2.forEach(function(_sorter) {
								var presentInSorter = sorterDI.indexOf(_sorter.dataIndx) >= 0,
									presentInGMDI = GMdi.indexOf(_sorter.dataIndx) >= 0;
								if (presentInSorter) {
									if (presentInGMDI) {
										sM();
										ui.sort_composite.push(that.iSort.compileSorter([_sorter], data))
									} else sorterMulti.push(_sorter)
								} else {
									sM();
									ui.sort_composite.push(undefined)
								}
							});
							sM()
						}
					})
				}
			}
		},
		_delaySort: function(ui, cb) {
			var self = this,
				that = self.that,
				pdata = that.pdata;
			if (pdata && pdata.length) {
				that.one("isSkipGroup", function() {
					cb && cb(pdata);
					ui.data = pdata;
					self.onCustomSortTree({}, ui);
					that.pdata = ui.data;
					self.summaryRestore();
					return false
				});
				return false
			}
		},
		summaryRestore: function() {
			var self = this,
				childstr = self.childstr,
				sumRow, that = self.that;

			function _s(titleRows, parent) {
				var data2 = [];
				titleRows.forEach(function(rd) {
					data2.push(rd);
					_s(rd[childstr] || [], rd).forEach(function(_rd) {
						data2.push(_rd)
					})
				});
				if (parent && (sumRow = parent.pq_child_sum) && !sumRow.pq_ghidden) {
					data2.push(sumRow)
				}
				return data2
			}
			that.pdata = _s(self.getRoots())
		},
		onDrop: function(that, self) {
			return function(evt, ui) {
				var dataIndx = ui.helper.data("di");
				self.addGroup(dataIndx);
				self.acceptDrop = false
			}
		},
		onSortable: function(self, o) {
			return function() {
				var arr = [],
					GMDataIndx = o.groupModel.dataIndx,
					refresh, $items = $(this).find(".pq-group-item"),
					$item, dataIndx;
				$items.each(function(i, item) {
					$item = $(item);
					dataIndx = $item.data("indx");
					if (GMDataIndx[i] !== dataIndx) {
						refresh = true
					}
					arr.push(dataIndx)
				});
				if (refresh) {
					self.option({
						dataIndx: arr
					}, "", "", function() {
						self.triggerChange()
					})
				}
			}
		},
		onDataReady: function(evt, ui) {
			var self = this,
				that = self.that,
				iSort = that.iSort,
				GM = that.options.groupModel,
				GMLen = GM.dataIndx.length;
			if (ui.group == false) {
				return
			}
			if (GM.on) {
				if (GMLen || GM.grandSummary) {
					if (that._trigger("isSkipGroup") !== false) {
						iSort.saveOrder();
						self.groupData();
						iSort.saveOrder("pq_gorder");
						self.buildCache()
					}
					that.iRefresh.addRowIndx();
					self.refreshColumns();
					if (GMLen) {
						self.initcollapsed();
						self.initmerge();
						if (self.isCascade(GM)) {
							self.cascadeInit()
						}
					}
				} else {
					self.refreshColumns()
				}
				self.setValCBox()
			}
			self.createHeader()
		},
		onColMove: function() {
			var self = this,
				GM = self.that.options.groupModel;
			if (GM.titleInFirstCol) {
				self.that.refreshView();
				return false
			} else if (GM.titleIndx) {} else {
				self.initmerge()
			}
		},
		option: function(ui, refresh, source, fn) {
			var di = ui.dataIndx,
				self = this,
				that = self.that,
				diLength = di ? di.length : 0,
				o = that.options,
				GM = o.groupModel,
				oldGM = $.extend({}, GM),
				evtObj = {
					source: source,
					oldGM: oldGM,
					ui: ui
				},
				GMdataIndx = GM.dataIndx;
			if (that._trigger("beforeGroupOption", null, evtObj) == false) {
				return
			}
			if (ui.agg) {
				self.updateAgg(ui.agg, GM.agg)
			}
			if (GM.on && GMdataIndx.length && (ui.on === false || diLength === 0)) {
				self.showRows()
			}
			$.extend(GM, ui);
			if (fn) fn();
			self.init();
			self.setOption();
			that._trigger("groupOption", null, evtObj);
			if (refresh !== false) {
				that.refreshView({
					refresh: false
				});
				that.sort({
					header: false
				})
			}
		},
		showRows: function() {
			this.that.options.dataModel.data.forEach(function(rd) {
				if (rd.pq_hidden) {
					rd.pq_hidden = undefined
				}
			})
		},
		renderBodyCell: function(o, GM, level) {
			var self = this,
				checkbox = GM.checkbox,
				titleInFirstCol = GM.titleIndx,
				_indent = titleInFirstCol ? GM.indent : 0,
				indent = _indent * level,
				arrCB, chk = "";
			if (level) indent += _indent;
			return function(ui) {
				var rd = ui.rowData,
					title, useLabel, column = ui.column,
					render = column.renderLabel;
				if (ui.Export) {
					return
				} else {
					title = render && render.call(self.that, ui);
					title = title || ui.formatVal || ui.cellData;
					if (checkbox && titleInFirstCol) {
						arrCB = self.renderCB(checkbox, rd, GM.cbId);
						if (arrCB) {
							chk = arrCB[0]
						}
					}
					useLabel = chk && (column.useLabel || GM.useLabel);
					return {
						text: (useLabel ? "<label>" : "") + chk + (title == null ? "" : title) + (useLabel ? "</label>" : ""),
						style: "text-indent:" + indent + "px;"
					}
				}
			}
		},
		renderCell: function(o, GM) {
			var self = this,
				renderTitle = self.renderTitle(o, GM),
				levelBody = GM.dataIndx.length - (self.isPivot() ? 1 : 0),
				renderBodyCell = self.renderBodyCell(o, GM, levelBody),
				renderSummary = self.renderSummary(o);
			return function(column, isTitleCol, getLines) {
				column._renderG = function(ui) {
					var rd = ui.rowData,
						ret, isBody, lines, isTitleRow = rd.pq_gtitle;
					if (isTitleCol && isTitleRow) {
						ret = renderTitle(ui)
					} else if (isTitleRow || rd.pq_gsummary) {
						ret = renderSummary(ui)
					} else if (GM.titleIndx == ui.dataIndx) {
						isBody = true;
						ret = renderBodyCell(ui)
					}
					if (getLines) {
						lines = self.getLines(isTitleRow, rd, isBody ? levelBody : rd.pq_level, GM.indent, "left");
						if (ret) {
							if (ret.text != null) ret.outer = lines;
							else ret = {
								outer: lines,
								text: ret
							}
						} else ret = {
							outer: lines
						}
					}
					return ret
				}
			}
		},
		renderSummary: function(o) {
			var self = this,
				that = this.that,
				GM = o.groupModel,
				GMDI = GM.dataIndx;
			return function(ui) {
				var rd = ui.rowData,
					val, column = ui.column,
					summary = column.summary,
					type, title, ret, level = rd.pq_level;
				if (summary && (type = summary[GMDI[level]] || summary.type)) {
					title = o.summaryTitle[type];
					if (typeof title == "function") {
						ret = title.call(that, ui)
					} else {
						val = ui.formatVal;
						if (val == null) {
							val = ui.cellData;
							val = val == null ? "" : val
						}
						if (typeof val == "number" && !column.format && parseInt(val) !== val) {
							val = val.toFixed(2)
						}
						if (title) {
							ret = title.replace("{0}", val)
						} else {
							ret = val
						}
					}
					return ret
				}
			}
		},
		updateformatVal: function(GM, ui, level) {
			var di = GM.dataIndx[level],
				that = this.that,
				column = that.columns[di];
			if (column && column.format && column != ui.column) {
				ui.formatVal = that.formatCol(column, ui.cellData)
			}
		},
		renderTitle: function(o, GM) {
			var self = this,
				that = self.that,
				rtl = o.rtl,
				checkbox = GM.checkbox,
				clsArr = ["pq-group-title-cell"],
				titleInFirstCol = GM.titleIndx,
				indent = GM.indent,
				icon = GM.icon,
				icons = ["ui-icon " + icon[0], "ui-icon " + icon[1]],
				arrCB, chk;
			return function(ui) {
				var rd = ui.rowData,
					column = ui.column,
					useLabel = column.useLabel,
					collapsed, level, title, clsIcon, indx;
				if (ui.cellData != null) {
					collapsed = rd.pq_close;
					level = rd.pq_level;
					title = GM.title;
					self.updateformatVal(GM, ui, level);
					title = column.renderLabel || title[level] || GM.titleDefault;
					title = typeof title === "function" ? title.call(that, ui) : title.replace("{0}", ui.formatVal || ui.cellData).replace("{1}", rd.pq_items);
					title = title == null ? ui.formatVal || ui.cellData : title;
					indx = collapsed ? 1 : 0;
					clsIcon = "pq-group-icon " + icons[indx];
					if (ui.Export) {
						return title
					} else {
						if (checkbox && titleInFirstCol && self.isCascade(GM)) {
							arrCB = self.renderCB(checkbox, rd, GM.cbId);
							if (arrCB) {
								chk = arrCB[0];
								if (arrCB[1]) clsArr.push(arrCB[1])
							}
						}
						useLabel = chk && (useLabel != null ? useLabel : GM.useLabel);
						return {
							text: [useLabel ? "<label>" : "", "<span class='", clsIcon, "'></span>", chk, title, useLabel ? "</label>" : ""].join(""),
							cls: clsArr.join(" "),
							style: "text-align:" + (rtl ? "right" : "left") + ";text-indent:" + indent * level + "px;"
						}
					}
				}
			}
		},
		triggerChange: function() {
			this.that._trigger("groupChange")
		},
		removeGroup: function(dataIndx) {
			var self = this;
			self.option({
				dataIndx: self.that.options.groupModel.dataIndx.filter(function(di) {
					return di != dataIndx
				})
			}, "", "", function() {
				self.triggerChange()
			})
		},
		refreshColumns: function() {
			var that = this.that,
				o = that.options,
				GM = o.groupModel,
				GM_on = GM.on,
				fixCols = GM.fixCols,
				renderCell = this.renderCell(o, GM),
				columns = that.columns,
				column, csummary, groupIndx = GM.dataIndx,
				groupIndxLen = groupIndx.length,
				colIndx, CM = that.colModel,
				i = CM.length;
			while (i--) {
				column = CM[i];
				if (column._renderG) {
					delete column._renderG
				}
				if (column._nodrag) {
					delete column._nodrag;
					delete column._nodrop
				}
				if (GM_on && (csummary = column.summary) && csummary.type) {
					renderCell(column)
				}
			}
			o.editor = GM_on ? this.editorSummary(o, GM) : this.oldEditor;
			if (GM_on) {
				if (GM.titleIndx) {
					column = columns[GM.titleIndx];
					renderCell(column, true, !GM.hideLines)
				} else {
					for (i = groupIndxLen - 1; i >= 0; i--) {
						column = columns[groupIndx[i]];
						renderCell(column, true)
					}
					if (fixCols && !GM.titleInFirstCol) {
						for (i = 0; i < groupIndxLen; i++) {
							colIndx = that.getColIndx({
								dataIndx: groupIndx[i]
							});
							column = CM[colIndx];
							column._nodrag = column._nodrop = true;
							if (colIndx != i) {
								that.iDragColumns.moveColumn(colIndx, i, true);
								that.refreshCM(null, {
									group: true
								})
							}
						}
					}
				}
			}
		},
		saveState: function() {
			var self = this,
				cache = self.nodeClose = self.nodeClose || {};
			self.fillState(cache)
		},
		setSumCols: function(GMdataIndx) {
			var sumCols = [],
				sumDIs = [];
			GMdataIndx = pq.objectify(GMdataIndx);
			this.that.colModel.forEach(function(column) {
				var summary = column.summary,
					di;
				if (summary && summary.type) {
					di = column.dataIndx;
					if (!GMdataIndx[di]) {
						sumCols.push(column);
						sumDIs.push(di)
					}
				}
			});
			this._sumCols = sumCols;
			this._sumDIs = sumDIs;
			return [sumCols, sumDIs]
		},
		setOption: function() {
			var self = this;
			if (self._init) {
				self.refreshColumns();
				self.summaryData.length = 0;
				self.initmerge()
			}
		},
		softRefresh: function() {
			var self = this,
				that = self.that;
			self.pdata = null;
			that.pdata.forEach(function(rd) {
				delete rd.pq_hidden
			});
			self.initcollapsed();
			self.initmerge();
			that.refresh({
				header: false
			})
		},
		toggleLevel: function(dataIndx, evt) {
			var GM = this.that.options.groupModel,
				collapsed = GM.collapsed,
				level = $.inArray(dataIndx, GM.dataIndx),
				all = pq.isCtrl(evt) ? "All" : "",
				close = collapsed[level];
			this[(close ? "expand" : "collapse") + all](level)
		},
		trigger: function(ui) {
			var evt = ui.evt,
				rd = ui.rd,
				_level = ui.level,
				all = ui.all,
				close = ui.close,
				that = this.that,
				level, di, val, i, GM = that.options.groupModel,
				groupIndx = GM.dataIndx,
				collapsed = GM.collapsed,
				_before = cGroup.beforeTrigger(evt, that),
				state = {};
			if (rd) {
				level = rd.pq_level;
				di = groupIndx[level], val = rd[di];
				close = !rd.pq_close;
				state = {
					level: level,
					close: close,
					group: val
				};
				if (_before(state)) {
					return false
				}
				rd.pq_close = close
			} else if (all) {
				state = {
					all: true,
					close: close,
					level: _level
				};
				if (_before(state)) {
					return false
				}
				for (i = _level; i < groupIndx.length; i++) {
					collapsed[i] = close
				}
			} else if (_level != null) {
				state = {
					level: _level,
					close: close
				};
				if (_before(state)) {
					return false
				}
				collapsed[_level] = close
			}
			return that._trigger("group", null, state)
		},
		toggleRow: function(rip, evt) {
			var that = this.that,
				pdata = that.pdata,
				rd = pdata[rip];
			if (this.trigger({
					evt: evt,
					rd: rd
				}) !== false) {
				this.softRefresh()
			}
		}
	});
	var fn = _pq.pqGrid.prototype;
	fn.Group = function(ui) {
		var iGV = this.iGroup;
		if (ui == null) {
			return iGV
		} else {
			iGV.expandTo(ui.indx)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		_pgrid = _pq.pqGrid.prototype,
		pq_options = _pgrid.options;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iDrag = new cDnD(grid)
	});
	var cDnD = _pq.cDrag = function(grid) {
		var self = this,
			o = grid.options,
			rtl = self.rtl = o.rtl,
			m = o.dragModel;
		if (m.on) {
			self.that = grid;
			o.postRenderInterval = o.postRenderInterval || -1;
			self.model = m;
			self.ns = ".pq-drag";
			m.tmplDragN = self.rtlfy(rtl, m.tmplDragN);
			m.tmplDrag = self.rtlfy(rtl, m.tmplDrag);
			grid.on("CMInit", self.onCMInit.bind(self)).on("create", self.onCreate.bind(self))
		}
	};
	_pgrid.Drag = function() {
		return this.iDrag
	};
	pq_options.dragModel = {
		afterDrop: function() {},
		beforeDrop: function(evt, uiDrop) {
			var Drag = this.Drag(),
				nodes = Drag.getUI().nodes,
				obj = this,
				T = this.Tree(),
				G = this.Group();
			if (T.isOn()) obj = T;
			else if (G.isOn()) obj = G;
			Drag.clean();
			obj.deleteNodes(nodes)
		},
		diDrag: -1,
		dragNodes: function(rd) {
			return [rd]
		},
		contentHelper: function(diHelper, dragNodes) {
			var rd = dragNodes[0],
				len = dragNodes.length;
			return diHelper.map(function(di) {
				return rd[di]
			}).join(", ") + (len > 1 ? " ( " + len + " )" : "")
		},
		clsHandle: "pq-drag-handle",
		clsDnD: "pq-dnd",
		clsNode: "pq-dnd-drag",
		iconAccept: "ui-icon ui-icon-check",
		iconReject: "ui-icon ui-icon-cancel",
		tmplDragN: "<span class='ui-icon ui-icon-grip-dotted-vertical pq-drag-handle' style='cursor:move;position:absolute;left:2px;margin-top:2px;'>&nbsp;</span>",
		tmplDrag: "<span class='ui-icon ui-icon-grip-dotted-vertical pq-drag-handle' style='cursor:move;vertical-align:text-bottom;touch-action:none;'>&nbsp;</span>",
		cssHelper: {
			opacity: .7,
			position: "absolute",
			height: 25,
			width: 200,
			overflow: "hidden",
			background: "#fff",
			border: "1px solid",
			boxShadow: "4px 4px 2px #aaaaaa",
			zIndex: 1001
		},
		tmplHelper: "<div class='pq-border-0 pq-grid-cell' style='pointer-events: none;'>" + "<span class='ui-icon' style='vertical-align:text-top;margin:2px 5px;'></span>" + "<span></span>" + "</div>"
	};
	cDnD.prototype = {
		addIcon: function(icon) {
			var cls = "ui-icon";
			this.$helper.find("." + cls).attr("class", "").addClass(cls + " " + icon)
		},
		addAcceptIcon: function() {
			this.addIcon(this.model.iconAccept)
		},
		addRejectIcon: function() {
			this.addIcon(this.model.iconReject)
		},
		getHelper: function(evt) {
			var self = this,
				that = self.that,
				m = self.model,
				clsNode = m.clsNode,
				$cell = $(evt.target).closest(".pq-grid-cell,.pq-grid-number-cell"),
				cellObj = self.cellObj = that.getCellIndices({
					$td: $cell
				}),
				diHelper = m.diHelper || [m.diDrag],
				rd = cellObj.rowData,
				dragNodes = cellObj.nodes = m.dragNodes.call(that, rd, evt),
				text = m.contentHelper.call(that, diHelper, dragNodes),
				$helper = self.$helper = $(m.tmplHelper),
				scale = that.getScale(),
				scaleB = pq.getScale(document.body);
			$helper.find("span:eq(1)").text(text);
			dragNodes.forEach(function(node) {
				that.addClass({
					rowData: node,
					cls: clsNode
				})
			});
			self.addRejectIcon();
			$helper.addClass("pq-theme pq-drag-helper").css(m.cssHelper).data("Drag", self);
			$helper.css({
				scale: scale[0] / scaleB[0] + " " + scale[1] / scaleB[1],
				"transform-origin": "0 0"
			});
			return $helper[0]
		},
		getUI: function() {
			return this.cellObj
		},
		grid: function() {
			return this.that
		},
		isSingle: function() {
			return this.getData().length == 1
		},
		getTextNodesIn: function(el) {
			return $(el).find(":not(iframe)").addBack().contents().filter(function() {
				return this.nodeType == 3 && $.trim(this.nodeValue).length
			})[0]
		},
		onCMInit: function() {
			var self = this,
				grid = self.that,
				m = self.model,
				isDraggable = m.isDraggable,
				col = grid.columns[m.diDrag],
				str = col ? m.tmplDrag : m.tmplDragN;
			(col || grid.options.numberCell).postRender = function(ui) {
				if (!isDraggable || isDraggable.call(grid, ui)) $(str).insertBefore(self.getTextNodesIn(ui.cell))
			}
		},
		onCreate: function() {
			var self = this,
				m = self.model,
				cursorAt = {
					top: 20
				},
				scaleB, numberDrag = m.diDrag == -1;
			self.that.on(true, "cellMouseDown", self.onCellMouseDown.bind(self));
			cursorAt[self.rtl ? "right" : "left"] = 2;
			self.ele = self.that.$cont.children(":first").addClass(m.clsDnD + (numberDrag ? " pq-drag-number" : "")).draggable($.extend({
				cursorAt: cursorAt,
				containment: "document",
				appendTo: "body"
			}, m.options, {
				handle: "." + m.clsHandle,
				helper: self.getHelper.bind(self),
				start: function() {
					scaleB = pq.getScale(document.body)
				},
				drag: function(evt, ui) {
					var pos = ui.position;
					pos.left = pos.left / scaleB[0];
					pos.top = pos.top / scaleB[1]
				},
				revert: self.revert.bind(self)
			}))
		},
		onDrop: function(evtName, evt, ui) {
			this.model[evtName].call(this.that, evt, ui)
		},
		clean: function() {
			var self = this;
			self.getUI().nodes.forEach(function(node) {
				self.that.removeClass({
					rowData: node,
					cls: self.model.clsNode
				})
			})
		},
		revert: function(dropped) {
			var self = this;
			self.clean();
			if (!dropped) self.$helper.hide("explode", function() {
				$(this).remove()
			})
		},
		rtlfy: function(rtl, style) {
			var obj = {
				left: "right",
				right: "left"
			};
			return rtl ? style.replace(/left|right/g, function(match) {
				return obj[match]
			}) : style
		},
		onCellMouseDown: function(evt) {
			var self = this,
				m = self.model,
				$target = $(evt.originalEvent.target);
			if ($target.closest("." + m.clsHandle).length) {
				evt.preventDefault()
			}
		},
		over: function(evt, ui) {
			this.addAcceptIcon()
		},
		out: function(evt, ui) {
			this.addRejectIcon()
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		_pgrid = _pq.pqGrid.prototype,
		pq_options = _pgrid.options;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iDrop = new cDnD(grid)
	});
	_pgrid.Drop = function() {
		return this.iDrop
	};
	pq_options.dropModel = {
		accept: ".pq-dnd",
		clsParent: "pq-dnd-parent",
		drop: function(evt, uiDrop) {
			var Drag = uiDrop.helper.data("Drag"),
				grid = this,
				G = grid.Group(),
				T = grid.Tree(),
				rdDrop = uiDrop.rowData,
				top = uiDrop.ratioY() <= .5,
				rowIndx = uiDrop.rowIndx,
				rowIndx = rowIndx == null ? rowIndx : rowIndx + (top ? 0 : 1),
				fn = function(G, isTree) {
					if (rdDrop || isTree) {
						var indx, parent = grid.iDrop.parent,
							children = G.getChildren(parent),
							clen = children.length;
						if (clen) {
							if (rdDrop)
								if (rdDrop == parent) indx = top ? null : 0;
								else indx = children.indexOf(rdDrop) + (top ? 0 : 1);
							else indx = clen
						}
						if (sameGrid) G.moveNodes(nodes, parent, indx);
						else {
							G.addNodes(nodes, parent, indx)
						}
					}
				};
			if (Drag) {
				var uiDrag = Drag.getUI(),
					sameGrid = Drag.grid() == grid,
					nodes = uiDrag.nodes;
				if (G.isOn()) {
					fn(G)
				} else if (T.isOn()) {
					fn(T, true)
				} else {
					if (sameGrid) grid.moveNodes(nodes, rowIndx);
					else {
						grid.addNodes(nodes, rowIndx)
					}
				}
			}
		},
		getParent: function(evt, ui) {
			var grid = this,
				rd = ui.rowData,
				o = grid.options,
				divider = grid.Drop().$divider,
				dividerLeft, G = grid.Group(),
				Gon = G.isOn(),
				T = grid.Tree(),
				parent, w, helper, hleft, left = o.rtl ? "right" : "left",
				Ton = T.isOn();
			if (rd) {
				if (Ton) {
					if (divider) {
						w = grid.element[0];
						helper = ui.helper[0];
						dividerLeft = divider[0].getClientRects()[0][left];
						hleft = helper.getClientRects()[0][left];
						parent = hleft > dividerLeft ? rd : T.getParent(rd)
					} else parent = T.getParent(rd)
				} else if (Gon) parent = G.getParent(rd);
				return parent
			}
		}
	};
	var cDnD = _pq.cDrop = function(grid) {
		var self = this,
			o = grid.options,
			m = o.dropModel;
		self.model = m;
		if (m.on) {
			self.that = grid;
			self.rtl = o.rtl;
			self.ns = ".pq-drop";
			grid.on("create", self.onCreate.bind(self))
		}
	};
	cDnD.prototype = {
		addUI: function(ui, evt, $cell) {
			var self = this;
			ui.$cell = $cell;
			ui.ratioY = function() {
				return self.ratioY(evt, $cell[0])
			};
			$.extend(ui, self.that.getCellIndices({
				$td: $cell
			}))
		},
		callFn: function(fn, evt, ui) {
			var fn2 = this.model[fn];
			if (fn2) return fn2.call(this.that, evt, ui)
		},
		feedback: function(evt, $cell) {
			if ($cell.length) {
				var self = this,
					that = self.that,
					cell = $cell[0],
					$cont = that.$cont,
					arr = self.getCellY(cell, $cont[0]),
					y1 = arr[0],
					y2 = arr[1],
					ratioY = self.ratioY(evt, cell);
				self.$feedback = self.$feedback || self.newF().appendTo($cont);
				self.$feedback.css({
					top: ratioY <= .5 ? y1 - 1 : y2 - 1,
					left: 0,
					width: $cont[0].clientWidth,
					zIndex: 1e4
				});
				$cont.css("cursor", "copy")
			}
		},
		getCell: function($ele) {
			return $ele.closest(".pq-grid-cell,.pq-grid-number-cell")
		},
		getCellY: function(cell, cont) {
			var y1 = pq.offset(cell, cont).top,
				y2 = y1 + cell.offsetHeight;
			return [y1, y2]
		},
		ratioY: function(evt, cell) {
			if (cell) {
				var rect = cell.getClientRects()[0],
					y1 = rect.top + window.scrollY,
					y2 = y1 + rect.height,
					y = evt.pageY;
				return (y - y1) / (y2 - y1)
			}
		},
		getDrag: function(ui) {
			return ui.helper.data("Drag")
		},
		isOn: function() {
			return this.model.on
		},
		isOver: function() {},
		newF: function() {
			return $("<svg class='pq-border-0' style='box-sizing:border-box;position:absolute;border-width:1.5px;border-style:dashed;pointer-events:none;height:0;'></svg>")
		},
		onCreate: function() {
			var self = this,
				that = self.that,
				$cont = that.$cont;
			$cont.droppable($.extend({
				tolerance: "pointer"
			}, self.model.options, {
				accept: self.model.accept,
				over: self.onOver.bind(self),
				out: self.onOut.bind(self),
				drop: self.onDrop.bind(self)
			}));
			$cont.on("dropactivate", function() {
				var scale = that.getScale();
				self.scaleX = scale[0];
				self.scaleY = scale[1]
			})
		},
		onOver: function(evt, ui) {
			var self = this,
				divider = self.model.divider,
				Drag = self.Drag = self.getDrag(ui);
			ui.draggable.on("drag.pq", self.onDrag.bind(self));
			if (divider) self.$divider = $("<svg class='pq-border-0' style='position:absolute;width:0;height:100%;" + (self.rtl ? "right:" : "left:") + divider + "px;top:0;border-style:dashed;border-width:1.5px;pointer-events:none;'></svg>").appendTo(self.that.$cont);
			if (Drag) {
				Drag.over(evt, ui)
			}
			self.isOver = function() {
				return true
			};
			self.callFn("over", evt, ui)
		},
		onOut: function(evt, ui) {
			ui.draggable.off("drag.pq");
			this.removeFeedback();
			var Drag = this.getDrag(ui),
				$left = this.$divider;
			$left && $left.remove();
			if (Drag) {
				Drag.out(evt, ui)
			}
			this.isOver = function() {};
			this.callFn("out", evt, ui)
		},
		setParent: function set(rd) {
			var that = this.that,
				clsParent = this.model.clsParent,
				oldParent = this.parent;
			if (oldParent != rd) {
				if (oldParent) {
					that.removeClass({
						rowData: oldParent,
						cls: clsParent
					})
				}
				if (rd) {
					that.addClass({
						rowData: rd,
						cls: clsParent
					})
				}
			}
			this.parent = rd
		},
		setDeny: function(evt, ui, $cell) {
			var self = this,
				Drag = self.Drag;
			self.denyDrop = self.callFn("isDroppable", evt, ui) === false;
			if (self.denyDrop) {
				if (Drag) Drag.out();
				self.removeFeedback()
			} else {
				if (Drag) Drag.over();
				self.feedback(evt, $cell);
				self.setParent(self.callFn("getParent", evt, ui))
			}
		},
		onDrag: function(evt, ui) {
			var self = this,
				$ele = pq.elementFromXY(evt),
				$cell = self.getCell($ele);
			if ($cell.length || self.that.$cont[0].contains($ele[0])) {
				self.addUI(ui, evt, $cell);
				self.setDeny(evt, ui, $cell)
			}
		},
		onDropX: function(evt, ui) {
			var self = this,
				that = self.that,
				draggable = ui.draggable,
				inst, Drag = ui.helper.data("Drag"),
				fn = function(evtName) {
					if (Drag && Drag.grid() != that) Drag.onDrop(evtName, evt, ui);
					else {
						try {
							inst = draggable.draggable("instance");
							inst.options[evtName].call(draggable[0], evt, ui)
						} catch (ex) {}
					}
				};
			fn("beforeDrop");
			self.callFn("drop", evt, ui);
			self.setParent();
			fn("afterDrop")
		},
		onDrop: function(evt, ui) {
			var self = this,
				$cell, $ele = pq.elementFromXY(evt);
			self.onOut(evt, ui);
			if (!self.denyDrop) {
				$cell = self.getCell($ele);
				if ($cell.length || self.that.$cont[0].contains($ele[0])) {
					self.addUI(ui, evt, $cell);
					self.onDropX(evt, ui)
				}
			}
		},
		onMouseout: function() {
			this.removeFeedback()
		},
		onMouseup: function() {
			var self = this;
			self.removeFeedback();
			$(document).off(self.ns);
			self.that.$cont.off(self.ns)
		},
		removeFeedback: function() {
			var self = this;
			if (self.$feedback) {
				self.$feedback.remove();
				self.$feedback = null
			}
			self.that.$cont.css("cursor", "");
			requestAnimationFrame(function() {
				self.setParent()
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.contextMenu = {
		preInit: function(evt) {
			if (pq.isCtrl(evt)) return false
		},
		init: function(evt, ui) {
			if (ui.$td) {
				var obj = {
						r1: ui.rowIndx,
						c1: ui.colIndx,
						rc: 1,
						cc: 1
					},
					S = this.Selection();
				if (!this.options.selectionModel.native && S.indexOf(obj) == -1) {
					S.removeAll();
					this.Range(obj).select();
					this.focus(ui)
				}
			}
		}
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iContext = new cContext(grid);
		grid.Context = function() {
			return grid.iContext
		}
	});
	var cContext = _pq.cContext = function(that) {
		var self = this,
			o = that.options;
		self.model = o.contextMenu;
		self.that = that;
		self.ns = ".pq-cmenu";
		self.rtl = o.rtl;
		that.on("context", self.onContext.bind(self)).on("destroy", self.removeMenu.bind(self))
	};
	cContext.prototype = {
		createMenu: function(items) {
			items = items.filter(function(item) {
				return item != null
			});
			var self = this,
				html = "",
				$div;
			items.forEach(function(item, i) {
				html += self.getItemHtml(item, i)
			});
			$div = $("<div dir='" + (self.rtl ? "rtl" : "ltr") + "' class='pq-cmenu pq-theme pq-popup'><table>" + html + "</table></div>").appendTo(document.body);
			$div.find(".pq-cmenu-item").each(function(i, item) {
				$(item).data("item", items[i])
			});
			$div.on("mouseover", self.onMouseOver.bind(self)).on("remove", self.onRemove(self)).on("mousedown", function(evt) {
				evt.preventDefault()
			});
			return $div
		},
		get$Item: function(evt) {
			return $(evt.target).closest(".pq-cmenu-item")
		},
		getItem: function(evt) {
			return this.get$Item(evt).data("item")
		},
		getItemHtml: function(item, i) {
			if (item == "separator") {
				return "<tr class='pq-cmenu-item'><td colspan=4 class='pq-bg-2' style='height:1px;padding:0;'></td></td>"
			} else {
				var style = item.style,
					tooltip = item.tooltip,
					styleStr = style ? 'style="' + style + '"' : "",
					attr = tooltip ? 'title="' + tooltip + '"' : "";
				return "<tr class='pq-cmenu-item " + (item.disabled ? "pq_disabled" : "") + " " + (item.cls || "") + "' indx=" + i + ">" + "<td><span class='" + (item.icon || "") + "' />" + "</td><td " + styleStr + " " + attr + ">" + item.name + "</td><td>" + (item.shortcut || "") + "</td><td><span class='" + (item.subItems ? "pq-submenu " + "ui-icon ui-icon-triangle-1-" + (this.rtl ? "w" : "e") : "") + "' />" + "</td></tr>"
			}
		},
		onContext: function(evt, ui) {
			if (this.model.on) return this.showMenu(evt, ui)
		},
		onRemove: function(self) {
			return function() {
				$(this).find(".pq-cmenu-item").each(self.removeSubMenu)
			}
		},
		onMouseDown: function(evt) {
			if (!this.getItem(evt)) {
				this.removeMenu()
			}
		},
		onclickDoc: function(evt) {
			var item = this.getItem(evt),
				ret, action;
			if (item) {
				if (!item.disabled) {
					action = item.action;
					if (action) {
						ret = action.call(this.that, evt, this.ui, item);
						if (ret !== false) this.removeMenu()
					}
				}
			}
		},
		onMouseOver: function(evt) {
			var self = this,
				rtl = self.rtl,
				item = self.getItem(evt),
				$subMenu, strMenu = "subMenu",
				$item = self.get$Item(evt),
				sitems = (item || {}).subItems;
			$item.siblings().each(self.removeSubMenu);
			if (sitems && sitems.length && !$item[0][strMenu]) {
				$subMenu = self.createMenu(sitems);
				self.addScale($item[0], $subMenu);
				pq.position($subMenu, {
					my: rtl ? "right top" : "left top",
					at: rtl ? "left top" : "right top",
					of: $item
				});
				$item[0][strMenu] = $subMenu
			}
		},
		removeMenu: function() {
			if (this.$menu) {
				this.$menu.remove();
				delete this.$menu;
				$(document.body).off(this.ns)
			}
		},
		removeSubMenu: function(i, node) {
			var strMenu = "subMenu";
			if (node[strMenu]) {
				node[strMenu].remove();
				delete node[strMenu]
			}
		},
		addScale: function(target, $menu) {
			var scale = pq.getScale(target),
				scaleP = pq.getScale($menu.parent()[0]);
			$menu.css({
				scale: scale[0] / scaleP[0] + " " + scale[1] / scaleP[1],
				"transform-origin": "0 0"
			})
		},
		showMenu: function(of, ui) {
			var self = this,
				rtl = self.rtl,
				m = self.model,
				ns = self.ns,
				that = self.that,
				$menu = self.$menu,
				type = ui.type,
				strItems = type + "Items",
				items = m[strItems] || (type ? m.items : m.miscItems),
				items = pq.isFn(items) ? items.call(that, of, ui) : items;
			if ($menu) self.removeMenu();
			if (items && items.length) {
				if (m.preInit.call(that, of, ui) !== false) {
					m.init.call(that, of, ui);
					self.ui = ui;
					$menu = self.$menu = self.createMenu(items);
					var target = (of.originalEvent || of).target || of [0] || of;
					self.addScale(target, $menu);
					pq.position($menu, {
						my: ui.my || (rtl ? "right" : "left") + " top",
						at: ui.at,
						of: of,
						collision: "fit"
					});
					$(document.body).on("click" + ns, self.onclickDoc.bind(self)).on("mousedown" + ns + " touchstart" + ns, self.onMouseDown.bind(self));
					return false
				}
			}
		}
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iAnim = new cAnim(grid)
	});
	var _pq = $.paramquery,
		cAnim = _pq.cAnim = function(grid) {
			var self = this,
				model = self.model = grid.options.animModel;
			self.grid = grid;
			self.nodes = [];
			if (model.on) {
				grid.on(model.events, self.onBefore.bind(self))
			}
		},
		_pgrid = _pq.pqGrid.prototype,
		pq_options = _pgrid.options;
	_pgrid.Anim = function() {
		return this.iAnim
	};
	pq_options.animModel = {
		duration: 290,
		events: "beforeSortDone beforeFilterDone beforeRowExpandDone beforeGroupExpandDone beforeMoveNode " + "beforeAutoRowHeight beforeValidateDone beforeTreeExpandDone onResizeHierarchy",
		eventsH: "beforeColAddDone beforeColRemoveDone beforeHideColsDone beforeColumnCollapseDone beforeColMoveDone beforeFlex columnResize"
	};
	_pq.mixAnim = {
		cleanUp: function() {
			(this.data || []).forEach(function(rd) {
				rd.pq_top = rd.pq_hideOld = undefined
			});
			this.data = this.render = null
		},
		stop: function() {
			this.nodes.forEach(function($nodes) {
				$nodes.stop()
			});
			this.nodes = []
		}
	};
	cAnim.prototype = $.extend({
		isActive: function() {
			return this._active
		},
		onBefore: function(evt, ui) {
			if (evt.isDefaultPrevented() || this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				iR = grid.iRenderB,
				data = self.data = iR.data,
				$rows, render = self.render = [];
			try {
				self.htTbl = iR.dims.htTbl;
				iR.eachV(function(rd, i) {
					$rows = iR.get$Row(i);
					rd.pq_render = 1;
					render.push([rd, $rows.clone(), $rows.map(function(j, row) {
						return row.parentNode
					})])
				});
				data.forEach(function(rd, i) {
					rd.pq_top = iR.getTop(i);
					rd.pq_hideOld = rd.pq_hidden
				});
				grid.one("refresh", self.oneRefresh.bind(self));
				setTimeout(function() {
					self.cleanUp()
				})
			} catch (ex) {
				self.data = null
			}
		},
		oneRefresh: function() {
			if (!this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				iR = grid.iRenderB,
				duration = self.model.duration,
				$tbl = $([iR.$tbl_left[0], iR.$tbl_right[0]]),
				htTbl = self.htTbl,
				htTbl2 = iR.dims.htTbl,
				$rows;
			self.stop();
			self._active = true;
			if (htTbl > htTbl2) {
				$tbl.css("height", htTbl)
			}
			setTimeout(function() {
				$tbl.css("height", iR.dims.htTbl);
				self._active = false
			}, duration);
			iR.eachV(function(rd, i) {
				delete rd.pq_render;
				var top = iR.getTop(i),
					topOld = rd.pq_top,
					obj1, obj2;
				if (topOld != top || rd.pq_hideOld) {
					$rows = iR.get$Row(i);
					if (topOld == null || rd.pq_hideOld) {
						obj1 = {
							opacity: 0
						};
						obj2 = {
							opacity: 1
						}
					} else {
						obj1 = {
							top: topOld
						};
						obj2 = {
							top: top
						}
					}
					$rows.css(obj1).animate(obj2, duration);
					self.nodes.push($rows)
				}
			});
			self.render.forEach(self.removeRows.bind(self));
			self.cleanUp()
		},
		removeRows: function(arr) {
			var self = this,
				rd = arr[0],
				$rows, ri = rd.pq_ri,
				top, duration = self.model.duration,
				obj = {
					opacity: 1,
					top: rd.pq_top
				};
			if (rd.pq_render) {
				delete rd.pq_render;
				$rows = arr[1].each(function(j, row) {
					$(row).removeAttr("id").appendTo(arr[2][j]).children().removeAttr("id")
				});
				$rows.css(obj);
				if (ri == null || rd.pq_hidden) {
					obj = {
						opacity: 0
					}
				} else {
					try {
						top = self.grid.iRenderB.getTop(ri);
						obj = {
							top: top
						}
					} catch (ex) {
						obj = {
							opacity: 0
						}
					}
				}
				$rows.animate(obj, duration, function() {
					if (this.parentNode) this.parentNode.removeChild(this)
				});
				self.nodes.push($rows)
			}
		}
	}, _pq.mixAnim)
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iAnimH = new cAnimH(grid)
	});
	var _pq = $.paramquery,
		cAnimH = _pq.cAnimH = function(grid) {
			var self = this,
				o = grid.options,
				model = self.model = o.animModel;
			self.grid = grid;
			self.rtl = o.rtl ? "right" : "left";
			self.nodes = [];
			if (model.on) {
				grid.on(model.eventsH, self.onBeforeCol.bind(self))
			}
		},
		_pgrid = _pq.pqGrid.prototype;
	_pgrid.AnimH = function() {
		return this.iAnimH
	};
	cAnimH.prototype = $.extend({
		get$Col: function() {
			var grid = this.grid,
				iR = grid.iRenderB,
				iRH = grid.iRenderHead,
				iRS = grid.iRenderSum,
				$cellsB = iR.getAllCells(),
				$cellsH = iRH.getAllCells(),
				$cellsS = iRS.getAllCells();
			return function(ci) {
				return iR.get$Col(ci, $cellsB).add(iRH.get$Col(ci, $cellsH)).add(iRS.get$Col(ci, $cellsS))
			}
		},
		onBeforeCol: function(evt) {
			if (evt.isDefaultPrevented() || this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				data = self.data = grid.getColModel(),
				$cols, get$Col = self.get$Col(),
				iR = grid.iRenderB,
				render = self.render = [];
			try {
				data.forEach(function(col, i) {
					col.pq_hideOld = col.hidden;
					col.pq_top = iR.getLeft(i)
				})
			} catch (ex) {
				self.cleanUp();
				return
			}
			iR.eachH(function(col, i) {
				$cols = get$Col(i);
				col.pq_render = 1;
				render.push([col, $cols.clone(), $cols.map(function(j, col) {
					return col.parentNode.id
				})])
			});
			grid.one("softRefresh refresh", self.oneRefreshCol.bind(self))
		},
		oneRefreshCol: function() {
			if (!this.data) {
				return
			}
			var self = this,
				grid = self.grid,
				iR = grid.iRenderB,
				duration = self.model.duration,
				get$Col = self.get$Col(),
				$cols;
			self.stop();
			iR.eachH(function(col, i) {
				delete col.pq_render;
				var left = iR.getLeft(i),
					leftOld = col.pq_top,
					rtl = self.rtl,
					o0 = {
						opacity: 0
					},
					o1 = {
						opacity: 1
					},
					o = {};
				if (leftOld != left || col.pq_hideOld) {
					$cols = get$Col(i);
					if (leftOld == null) {
						$cols.css(o0).animate(o1, duration)
					} else if (col.pq_hideOld) {
						o0[rtl] = leftOld;
						o1[rtl] = left;
						$cols.css(o0).animate(o1, duration)
					} else {
						o[rtl] = left;
						$cols.css(rtl, leftOld).animate(o, duration)
					}
					self.nodes.push($cols)
				}
			});
			self.render.forEach(self.removeCols.bind(self));
			self.cleanUp()
		},
		removeCols: function(arr) {
			var self = this,
				col = arr[0],
				$cols, duration = self.model.duration,
				grid = self.grid,
				iR = grid.iRenderB,
				ci = grid.colIndxs[col.dataIndx],
				left, obj;
			if (col.pq_render) {
				delete col.pq_render;
				$cols = arr[1].each(function(j, col) {
					$(col).removeAttr("id").appendTo(document.getElementById(arr[2][j]))
				});
				if (ci == null || col.hidden) {
					$cols.css("opacity", 1);
					obj = {
						opacity: 0
					}
				} else {
					left = iR.getLeft(ci);
					obj = {
						left: left
					}
				}
				$cols.animate(obj, duration, function() {
					if (this.parentNode) this.parentNode.removeChild(this)
				});
				self.nodes.push($cols)
			}
		}
	}, _pq.mixAnim)
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		defaults = _pq.pqGrid.defaults;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iFillHandle = new cFillHandle(grid)
	});
	defaults.autofill = true;
	var cFillHandle = _pq.cFillHandle = function(that) {
		var self = this;
		self.$wrap;
		self.locked;
		self.sel;
		self.that = that;
		self.rtl = that.options.rtl;
		that.on("selectChange", self.onSelectChange(self)).on("selectEnd", self.onSelectEnd(self)).on("assignTblDims", self.onRefresh(self)).on("keyDown", self.onKeyDown.bind(self))
	};
	cFillHandle.prototype = {
		getLT: function(x2y2, d, tbl, WidthORHeight) {
			var d2 = d / 2,
				left = x2y2 - d2,
				right = Math.min(left + d, tbl["offset" + WidthORHeight]),
				left = right - d;
			return left
		},
		create: function() {
			var self = this,
				that = self.that,
				area;
			if (self.locked) return;
			self.remove();
			area = that.Selection().address();
			if (area.length !== 1) return;
			var area = area[0],
				r2 = area.r2,
				c2 = area.c2,
				iM = that.iMerge,
				parentNode = "parentNode",
				uiM = iM.getRootCellO(r2, c2, true),
				$td = that.getCell(uiM);
			if ($td.length) {
				if (that._trigger("beforeFillHandle", null, uiM) !== false) {
					var td = $td[0],
						tbl = td[parentNode][parentNode],
						cont = tbl[parentNode],
						d = 10,
						arr = that.iRenderB.getCellCoords(uiM.rowIndxPage, uiM.colIndx),
						left = self.getLT(arr[2], d, tbl, "Width"),
						top = self.getLT(arr[3], d, tbl, "Height"),
						obj = {
							position: "absolute",
							top: top,
							height: d,
							width: d,
							background: "#333",
							cursor: "crosshair",
							border: "2px solid #fff",
							zIndex: 1
						},
						$wrap = $("<div class='pq-fill-handle'></div>").appendTo(cont);
					obj[self.rtl ? "right" : "left"] = left;
					$wrap.css(obj);
					self.$wrap = $wrap;
					self.setDraggable();
					self.setDoubleClickable()
				}
			}
		},
		onSelectChange: function(self) {
			return function() {
				self.remove()
			}
		},
		onSelectEnd: function(self) {
			return function() {
				if (this.options.fillHandle) {
					self.create()
				}
			}
		},
		onRefresh: function(self) {
			var id;
			return function() {
				if (this.options.fillHandle) {
					clearTimeout(id);
					id = setTimeout(function() {
						if (self.that.element) {
							self.create()
						}
					}, 50)
				} else {
					self.remove()
				}
			}
		},
		remove: function() {
			var $wrap = this.$wrap;
			$wrap && $wrap.remove()
		},
		setDoubleClickable: function() {
			var self = this,
				$wrap = self.$wrap;
			$wrap && $wrap.on("dblclick", self.onDblClick(self.that, self))
		},
		setDraggable: function() {
			var self = this,
				$wrap = self.$wrap,
				$cont = self.that.$cont;
			$wrap && $wrap.draggable({
				helper: function() {
					return "<div style='height:10px;width:10px;cursor:crosshair;'></div>"
				},
				appendTo: $cont,
				start: self.onStart.bind(self),
				drag: self.onDrag.bind(self),
				stop: self.onStop.bind(self)
			})
		},
		patternDate: function(a) {
			var self = this;
			return function(x) {
				var dateObj = new Date(a);
				dateObj.setDate(dateObj.getDate() + (x - 1));
				return self.formatDate(dateObj)
			}
		},
		formatDate: function(dateObj) {
			return dateObj.getFullYear() + "-" + pq.pad(dateObj.getMonth() + 1) + "-" + pq.pad(dateObj.getDate())
		},
		patternDate2: function(c0, c1) {
			var d0 = new Date(c0),
				d1 = new Date(c1),
				diff, self = this,
				incrDate = d1.getDate() - d0.getDate(),
				incrMonth = d1.getMonth() - d0.getMonth(),
				incrYear = d1.getFullYear() - d0.getFullYear();
			if (!incrMonth && !incrYear || !incrDate && !incrMonth || !incrYear && !incrDate) {
				return function(x) {
					var dateObj = new Date(c0);
					if (incrDate) {
						dateObj.setDate(dateObj.getDate() + incrDate * (x - 1))
					} else if (incrMonth) {
						dateObj.setMonth(dateObj.getMonth() + incrMonth * (x - 1))
					} else {
						dateObj.setFullYear(dateObj.getFullYear() + incrYear * (x - 1))
					}
					return self.formatDate(dateObj)
				}
			}
			d0 = Date.parse(d0);
			diff = Date.parse(d1) - d0;
			return function(x) {
				var dateObj = new Date(d0 + diff * (x - 1));
				return self.formatDate(dateObj)
			}
		},
		getDT: function(cells) {
			var len = cells.length,
				i = 0,
				val, oldDT, dt, valid = pq.valid;
			for (; i < len; i++) {
				val = cells[i];
				if (valid.isFloat(val)) dt = "number";
				else if (valid.isDate(val)) dt = "date";
				if (oldDT && oldDT != dt) {
					return "string"
				}
				oldDT = dt
			}
			return dt
		},
		pattern: function(cells) {
			var dt = this.getDT(cells);
			if (dt == "string" || !dt) {
				return false
			}
			var a, b, c, len = cells.length,
				date = dt === "date";
			if (!date) {
				cells = cells.map(function(cell) {
					return cell * 1
				})
			}
			if (len === 2) {
				if (date) {
					return this.patternDate2(cells[0], cells[1])
				}
				a = cells[1] - cells[0];
				b = cells[0] - a;
				return function(x) {
					return a * x + b
				}
			}
			if (len === 3) {
				a = (cells[2] - 2 * cells[1] + cells[0]) / 2;
				b = cells[1] - cells[0] - 3 * a;
				c = cells[0] - a - b;
				return function(x) {
					return a * x * x + b * x + c
				}
			}
			return false
		},
		autofillVal: function(sel1, sel2, patternArr, xDir) {
			var that = this.that,
				r1 = sel1.r1,
				c1 = sel1.c1,
				r2 = sel1.r2,
				c2 = sel1.c2,
				r21 = sel2.r1,
				c21 = sel2.c1,
				r22 = sel2.r2,
				c22 = sel2.c2,
				val = [],
				k, i, j, sel3, x;
			if (xDir) {
				sel3 = {
					r1: r1,
					r2: r2
				};
				sel3.c1 = c21 < c1 ? c21 : c2 + 1;
				sel3.c2 = c21 < c1 ? c1 - 1 : c22;
				x = c21 - c1;
				for (i = c21; i <= c22; i++) {
					x++;
					if (i < c1 || i > c2) {
						k = 0;
						for (j = r1; j <= r2; j++) {
							val.push(patternArr[k](x, i));
							k++
						}
					}
				}
			} else {
				sel3 = {
					c1: c1,
					c2: c2
				};
				sel3.r1 = r21 < r1 ? r21 : r2 + 1;
				sel3.r2 = r21 < r1 ? r1 - 1 : r22;
				x = r21 - r1;
				for (i = r21; i <= r22; i++) {
					x++;
					if (i < r1 || i > r2) {
						k = 0;
						for (j = c1; j <= c2; j++) {
							val.push(patternArr[k](x, i));
							k++
						}
					}
				}
			}
			that.Range(sel3).value(val);
			that.focus({
				rowIndxPage: sel1.r1,
				colIndx: sel1.c1,
				noscroll: true
			});
			return true
		},
		autofill: function(sel1, sel2) {
			var that = this.that,
				CM = that.colModel,
				col, dt, cells, di, i, j, obj, data = that.get_p_data(),
				pattern, patternArr = [],
				r1 = sel1.r1,
				c1 = sel1.c1,
				r2 = sel1.r2,
				c2 = sel1.c2,
				xDir = sel2.c1 != c1 || sel2.c2 != c2;
			if (xDir) {
				for (i = r1; i <= r2; i++) {
					obj = {
						sel: {
							r: i,
							c: c1
						},
						x: true
					};
					that._trigger("autofillSeries", null, obj);
					if (pattern = obj.series) {
						patternArr.push(pattern)
					} else {
						return
					}
				}
				return this.autofillVal(sel1, sel2, patternArr, xDir)
			} else {
				for (j = c1; j <= c2; j++) {
					col = CM[j];
					dt = col.dataType;
					di = col.dataIndx;
					cells = [];
					for (i = r1; i <= r2; i++) {
						cells.push(data[i][di])
					}
					obj = {
						cells: cells,
						sel: {
							r1: r1,
							c: j,
							r2: r2,
							r: r1
						}
					};
					that._trigger("autofillSeries", null, obj);
					if (pattern = obj.series || this.pattern(cells, dt)) {
						patternArr.push(pattern)
					} else {
						return
					}
				}
				return this.autofillVal(sel1, sel2, patternArr)
			}
		},
		onKeyDown: function(evt) {
			if (!this.oldAF && pq.isCtrl(evt)) {
				var self = this,
					o = self.that.options;
				self.oldAF = o.autofill;
				o.autofill = false;
				$(document.body).one("keyup", function() {
					o.autofill = self.oldAF;
					delete self.oldAF
				})
			}
		},
		onStop: function() {
			var self = this,
				that = self.that,
				autofill = that.options.autofill,
				sel1 = self.sel,
				sel2 = that.Selection().address()[0];
			if (sel1.r1 != sel2.r1 || sel1.c1 != sel2.c1 || sel1.r2 != sel2.r2 || sel1.c2 != sel2.c2) {
				if (!(autofill && self.autofill(sel1, sel2))) {
					that.Range(sel1).copy({
						dest: sel2
					});
					that.focus({
						rowIndxPage: sel1.r1,
						colIndx: sel1.c1,
						noscroll: true
					})
				}
			}
			self.locked = false
		},
		onStart: function() {
			this.locked = true;
			this.sel = this.that.Selection().address()[0]
		},
		onDrag: function(evt) {
			var self = this,
				that = self.that,
				fillHandle = that.options.fillHandle,
				all = fillHandle == "all",
				hor = all || fillHandle == "horizontal",
				vert = all || fillHandle == "vertical",
				x = evt.clientX - 10,
				y = evt.clientY,
				ele = document.elementFromPoint(x, y),
				$td = $(ele).closest(".pq-grid-cell");
			if ($td.length) {
				var cord = that.getCellIndices({
						$td: $td
					}),
					sel = self.sel,
					r1 = sel.r1,
					c1 = sel.c1,
					r2 = sel.r2,
					c2 = sel.c2,
					range = {
						r1: r1,
						c1: c1,
						r2: r2,
						c2: c2
					},
					update = function(key, val) {
						range[key] = val;
						that.Range(range).select()
					},
					ri = cord.rowIndx,
					ci = cord.colIndx;
				if (all && ri <= r2 && ri >= r1 || hor && !vert) {
					if (ci > c2) {
						update("c2", ci)
					} else if (ci < c1) {
						update("c1", ci)
					}
				} else if (vert) {
					if (ri > r2) {
						update("r2", ri)
					} else if (ri < r1) {
						update("r1", ri)
					}
				}
			}
		},
		onDblClick: function(that, self) {
			return function() {
				var o = that.options,
					fillHandle = o.fillHandle;
				if (fillHandle == "all" || fillHandle == "vertical") {
					var sel = that.Selection().address()[0],
						rd, c2 = sel.c2,
						ri = sel.r2 + 1,
						data = o.dataModel.data,
						di = that.getColModel()[c2].dataIndx;
					while (rd = data[ri]) {
						if (rd[di] == null || rd[di] === "") {
							ri++
						} else {
							ri--;
							break
						}
					}
					self.onStart();
					that.Range({
						r1: sel.r1,
						c1: sel.c1,
						r2: ri,
						c2: c2
					}).select();
					self.onStop()
				}
			}
		}
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		new cScroll(ui.instance)
	});
	var cScroll = $.paramquery.cScroll = function(that) {
		var self = this;
		self.that = that;
		self.ns = ".pqgrid-csroll";
		self.rtl = that.options.rtl;
		that.on("create", self.onCreate.bind(self))
	};
	cScroll.prototype = {
		onCreate: function() {
			var self = this,
				that = self.that,
				isdrop = that.iDrop && that.iDrop.isOn();
			$(isdrop ? document : that.$cont).on("mousedown", self.onMouseDown.bind(self))
		},
		onMouseDown: function(evt) {
			var self = this,
				that = self.that,
				$target = $((evt.originalEvent || evt).target),
				$draggable = self.$draggable = $target.closest(".ui-draggable"),
				isDraggable = $draggable.length,
				isFillHandle, ns = self.ns;
			if (isDraggable || $target.closest(that.$cont).length) {
				isFillHandle = $target.closest(".pq-fill-handle").length;
				$(document).on("mousemove" + ns, self.process.bind(self)).on("mouseup" + ns, self.onMouseUp.bind(self))
			}
		},
		onMouseUp: function() {
			$(document).off(this.ns);
			this.capture = false
		},
		process: function(evt) {
			var self = this,
				that = self.that,
				$cont = that.$cont;
			if ($cont) {
				var cont = $cont[0],
					rect = cont.getBoundingClientRect(),
					top = rect.top,
					bottom = rect.bottom,
					left = rect.left,
					right = rect.right,
					clientX = evt.clientX,
					clientY = evt.clientY,
					diff = 30,
					dxL = left - clientX,
					dxR = clientX - right,
					dyT = top - clientY,
					dyB = clientY - bottom;
				if (clientX > left && clientX < right) {
					if (dyB > 0 && dyB <= diff) self.scrollV(dyB, true);
					else if (dyT > 0 && dyT <= diff) self.scrollV(dyT)
				} else if (clientY > top && clientY < bottom) {
					if (dxR > 0 && dxR <= diff) self.scrollH(dxR, true);
					else if (dxL > 0 && dxL <= diff) self.scrollH(dxL)
				}
			}
		},
		scrollH: function(diff, down) {
			this.scroll(diff, this.rtl ? !down : down, true)
		},
		scrollV: function(diff, down) {
			this.scroll(diff, down)
		},
		scroll: function(diff, down, x) {
			var that = this.that,
				iR = that.iRenderB,
				cr = iR.getContRight()[0],
				ht = cr[x ? "scrollWidth" : "scrollHeight"],
				scroll = pq[x ? "scrollLeft" : "scrollTop"](cr),
				factor = ht < 1e3 ? 1 : 1 + (ht - 1e3) / ht;
			diff = Math.pow(diff, factor);
			var scroll2 = scroll + (down ? diff : -diff);
			iR[x ? "scrollX" : "scrollY"](scroll2)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.cFormula = function(that) {
		var self = this;
		self.that = that;
		self.oldF = [];
		that.one("ready", function() {
			that.on("CMInit", self.onCMInit.bind(self))
		}).on("beforePivotSummary", self.calcMainData.bind(self)).on("dataAvailable", self.onDA.bind(self)).on(true, "change", self.onChange.bind(self))
	};
	_pq.cFormula.prototype = {
		onCMInit: function() {
			var self = this;
			if (self.isFormulaChange(self.oldF, self.formulas())) {
				self.calcMainData()
			}
		},
		callRow: function(rowData, formulas, flen) {
			var that = this.that,
				j = 0;
			if (rowData) {
				for (; j < flen; j++) {
					var fobj = formulas[j],
						column = fobj[0],
						formula = fobj[1];
					rowData[column.dataIndx] = formula.call(that, rowData, column, fobj[2])
				}
			}
		},
		onDA: function() {
			this.calcMainData()
		},
		isFormulaChange: function(oldF, newF) {
			var diff = false,
				i = 0,
				ol = oldF.length,
				nl = newF.length;
			if (ol == nl) {
				for (; i < ol; i++) {
					if (oldF[i][1] != newF[i][1]) {
						diff = true;
						break
					}
				}
			} else {
				diff = true
			}
			return diff
		},
		calcMainData: function() {
			var formulas = this.formulaSave(),
				that = this.that,
				flen = formulas.length;
			if (flen) {
				var o = that.options,
					data = o.dataModel.data,
					i = data.length;
				while (i--) {
					this.callRow(data[i], formulas, flen)
				}
				that._trigger("formulaComputed")
			}
		},
		onChange: function(evt, ui) {
			var self = this,
				that = self.that,
				rObj2, formulas = self.formulas(),
				flen = formulas.length,
				addList = ui.addList,
				updateList = ui.updateList,
				fn = function(rObj) {
					self.callRow(rObj.rowData, formulas, flen)
				};
			if (flen) {
				addList.forEach(fn);
				updateList.forEach(fn);
				if (updateList.length == 1 && !addList.length) {
					rObj2 = updateList[0];
					formulas.forEach(function(f) {
						that.refreshCell({
							rowIndx: rObj2.rowIndx,
							dataIndx: f[0].dataIndx
						})
					})
				}
			}
		},
		formulas: function() {
			var that = this.that,
				arr = [],
				column, formula, cis = that.colIndxs,
				di, formulas = that.options.formulas || [];
			formulas.forEach(function(_arr) {
				di = _arr[0];
				column = that.getColumn({
					dataIndx: di
				});
				if (column) {
					formula = _arr[1];
					if (formula) {
						arr.push([column, formula, cis[di]])
					}
				}
			});
			return arr
		},
		formulaSave: function() {
			var arr = this.formulas();
			this.oldF = arr;
			return arr
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.treeModel = {
		cbId: "pq_tree_cb",
		source: "checkboxTree",
		childstr: "children",
		iconCollapse: ["ui-icon-triangle-1-se", "ui-icon-triangle-1-e"],
		iconFolder: ["ui-icon-folder-open", "ui-icon-folder-collapsed"],
		iconFile: "ui-icon-document",
		id: "id",
		indent: 18,
		parentId: "parentId",
		refreshOnChange: true
	};
	_pq.pqGrid.prototype.Tree = function() {
		return this.iTree
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iTree = new cTree(grid)
	});
	var cTree = _pq.cTree = function(that) {
		var self = this;
		self.Model = that.options.treeModel;
		self.that = that;
		self.fns = {};
		self.init();
		self.isTree = true;
		self.cache = {};
		self.di_prev;
		self.chkRows = [];
		Object.defineProperty(self.Model, "nodeClose", {
			get: function() {
				return self.fillState({})
			},
			set: function(obj) {
				self.nodeClose = obj
			}
		})
	};
	cTree.prototype = $.extend({}, pq.mixin.ChkGrpTree, pq.mixin.GrpTree, {
		addNodes: function(_nodes, parent, indx) {
			var self = this,
				that = self.that,
				o = that.options,
				DM = o.dataModel,
				TM = self.Model,
				data = DM.data,
				parentIdstr = self.parentId,
				childstr = self.childstr,
				children, node, idstr = self.id,
				cache = {},
				rowIndx, nodes = [],
				i = 0,
				len, node, oldCache = self.cache,
				parentId, parent2, addList = [];
			_nodes.forEach(function(node) {
				parentId = node[parentIdstr];
				parent2 = parent2 || oldCache[parentId];
				self.eachChild(node, function(child, _parent) {
					var id = child[idstr];
					if (!oldCache[id] && !cache[id]) {
						cache[id] = child;
						if (_parent) child[parentIdstr] = _parent[idstr];
						nodes.push(child)
					}
				}, parent || oldCache[parentId])
			});
			nodes.forEach(function(node) {
				parentId = node[parentIdstr];
				if (!cache[parentId] && !oldCache[parentId]) delete node[parentIdstr]
			});
			parent = parent || parent2;
			children = (parent || {})[childstr] || self.getRoots() || [];
			len = children.length;
			if (len) {
				if (indx == 0) node = parent;
				else if (indx == null || indx > len) node = children[len - 1];
				else node = children[indx - 1]
			} else node = parent;
			rowIndx = data.indexOf(node) + 1;
			len = nodes.length;
			if (len) {
				for (; i < len; i++) {
					node = nodes[i];
					addList.push({
						newRow: node,
						rowIndx: rowIndx++
					})
				}
				that._digestData({
					addList: addList,
					checkEditable: false,
					source: "addNodes",
					history: TM.historyAdd
				});
				self.refreshView()
			}
		},
		updateId: function(node, id) {
			var idstr = this.id,
				parentIdstr = this.parentId,
				oldId = node[idstr],
				cache = this.cache;
			if (!cache[id]) {
				node[idstr] = id;
				cache[id] = node;
				delete cache[oldId];
				(this.getChildren(node) || []).forEach(function(child) {
					child[parentIdstr] = id
				})
			}
		},
		collapseAll: function(open) {
			this[open ? "expandNodes" : "collapseNodes"](this.that.options.dataModel.data)
		},
		collapseNodes: function(nodes, evt, open) {
			var i = 0,
				that = this.that,
				len = nodes.length,
				node, nodes2 = [],
				ui, close = !open;
			for (; i < len; i++) {
				node = nodes[i];
				if (this.isFolder(node) && this.isCollapsed(node) !== close) {
					nodes2.push(node)
				}
			}
			if (nodes2.length) {
				ui = {
					close: close,
					nodes: nodes2
				};
				if (that._trigger("beforeTreeExpand", evt, ui) !== false) {
					len = nodes2.length;
					for (i = 0; i < len; i++) {
						node = nodes2[i];
						node.pq_close = close
					}
					that._trigger("treeExpand", evt, ui);
					this.setCascadeInit(false);
					this.refreshView()
				}
			}
		},
		deleteNodes: function(nodes) {
			var self = this,
				that = self.that,
				TM = self.Model,
				i = 0,
				len, rd1, obj = {},
				id = self.id,
				deleteList = [];
			if (nodes) {
				len = nodes.length;
				for (; i < len; i++) {
					rd1 = nodes[i];
					self.eachChild(rd1, function(child) {
						var id2 = child[id];
						if (!obj[id2]) {
							obj[id2] = 1;
							deleteList.push({
								rowData: child
							})
						}
					})
				}
				that._digestData({
					deleteList: deleteList,
					source: "deleteNodes",
					history: TM.historyDelete
				});
				self.refreshView()
			}
		},
		makeLeaf: function(node) {
			node[this.childstr] = node.pq_close = node.pq_child_sum = undefined
		},
		expandAll: function() {
			this.collapseAll(true)
		},
		expandNodes: function(nodes, evt) {
			this.collapseNodes(nodes, evt, true)
		},
		expandTo: function(node) {
			var nodes = [];
			do {
				if (node.pq_close) {
					nodes.push(node)
				}
			} while (node = this.getParent(node));
			this.expandNodes(nodes)
		},
		exportCell: function(cellData, level) {
			var str = "",
				i = 0;
			for (; i < level; i++) {
				str += "- "
			}
			return str + (cellData == null ? "" : cellData)
		},
		filter: function(data, arrS, iF, FMmode, dataTmp, dataUF, hideRows) {
			var rd, ret, found, self = this,
				childstr = self.childstr,
				filterShowChildren = self.Model.filterShowChildren,
				nodes, i = 0,
				len = data.length,
				fn = function(node, _found) {
					found = _found || found;
					if (hideRows) node.pq_hidden = node.pq_filter = !_found;
					else if (_found) dataTmp.push(node);
					else dataUF.push(node)
				};
			for (; i < len; i++) {
				rd = data[i];
				ret = false;
				if (nodes = rd[childstr]) {
					if (filterShowChildren && iF.isMatchRow(rd, arrS, FMmode)) {
						self.eachChild(rd, function(_node) {
							fn(_node, true)
						});
						found = true;
						continue
					}
					ret = self.filter(nodes, arrS, iF, FMmode, dataTmp, dataUF, hideRows);
					if (ret) {
						fn(rd, true)
					}
				}
				if (!ret) {
					fn(rd, iF.isMatchRow(rd, arrS, FMmode))
				}
			}
			return found
		},
		getFormat: function() {
			var self = this,
				data = self.that.options.dataModel.data,
				format = "flat",
				i = 0,
				len = data.length,
				parentId = self.parentId,
				childstr = self.childstr,
				rd, children;
			for (; i < len; i++) {
				rd = data[i];
				if (rd[parentId] != null) {
					break
				} else if ((children = rd[childstr]) && children.length) {
					return self.getParent(children[0]) == rd ? "flat" : "nested"
				}
			}
			return format
		},
		getLevel: function(rd) {
			return rd.pq_level
		},
		_groupById: function(data, _id, children, groups, level) {
			var self = this,
				gchildren, childstr = self.childstr,
				i = 0,
				len = children.length;
			for (; i < len; i++) {
				var rd = children[i],
					id = rd[_id];
				rd.pq_level = level;
				data.push(rd);
				if (gchildren = groups[id]) {
					rd[childstr] = gchildren;
					self._groupById(data, _id, gchildren, groups, level + 1)
				} else {
					if (rd.pq_close != null || rd[childstr]) rd[childstr] = []
				}
			}
		},
		groupById: function(data) {
			var self = this,
				id = self.id,
				pId, parentId = self.parentId,
				groups = {},
				group, data2 = [],
				i = 0,
				len = data.length,
				rd;
			for (; i < len; i++) {
				rd = data[i];
				pId = rd[parentId];
				pId == null && (pId = "");
				if (!(group = groups[pId])) {
					group = groups[pId] = []
				}
				group.push(rd)
			}
			self._groupById(data2, id, groups[""] || [], groups, 0);
			return data2
		},
		init: function() {
			var self = this,
				that = self.that,
				o = that.options,
				TM = self.Model,
				cbId = TM.cbId,
				di = self.dataIndx = TM.dataIndx;
			self.cbId = cbId;
			self.prop = "pq_tree_prop";
			self.id = TM.id;
			self.parentId = TM.parentId;
			self.childstr = TM.childstr;
			self.onCMInit();
			if (di) {
				if (!self._init) {
					self.on("CMInit", self.onCMInit.bind(self)).on("dataAvailable", self.onDataAvailable.bind(self)).on("dataReadyAfter", self.onDataReadyAfter.bind(self)).on("beforeCellKeyDown", self.onBeforeCellKeyDown.bind(self)).on("customSort", self.onCustomSortTree.bind(self)).on("customFilter", self.onCustomFilter.bind(self)).on("clearFilter", self.onClearFilter.bind(self)).on("change", self.onChange(self, that, TM)).on("cellClick", self.onCellClick.bind(self)).on("refresh refreshRow", self.onRefresh(self, TM)).on("valChange", self.onCheckbox(self, TM)).on("refreshHeader", self.onRefreshHeader.bind(self)).on("beforeCheck", self.onBeforeCheck.bind(self));
					self.setCascadeInit(true);
					self._init = true
				}
			} else if (self._init) {
				self.off();
				self._init = false
			}
			if (self._init) {
				o.groupModel.on = TM.summary
			}
		},
		initData: function() {
			var self = this,
				that = self.that,
				o = that.options,
				DM = o.dataModel;
			DM.data = self[self.getFormat() == "flat" ? "groupById" : "flatten"](DM.data);
			self.buildCache()
		},
		isCollapsed: function(rd) {
			return !!rd.pq_close
		},
		isOn: function() {
			return this.Model.dataIndx != null
		},
		moveNodes: function(nodes, parentNew, indx, skipHistory) {
			var self = this,
				args = arguments,
				that = self.that,
				indxOrig = indx,
				parentIdstr = self.parentId,
				idstr = self.id,
				childstr = self.childstr,
				o = that.options,
				TM = self.Model,
				DM = o.dataModel,
				dataOld, dataNew, roots = self.getRoots(),
				historySupport = !skipHistory,
				children = parentNew ? parentNew[childstr] = parentNew[childstr] || [] : roots,
				childrenLen = children.length,
				parentNewId, parentOld, indxOld, nodesUnq = self.getUniqueNodes(nodes),
				indx = indx == null || indx >= childrenLen ? childrenLen : indx,
				i, len, node, dataNew = children;
			if (parentNew) {
				parentNewId = parentNew[idstr]
			}
			len = nodesUnq.length;
			if (len) {
				that._trigger("beforeMoveNode", null, {
					args: args
				});
				if (historySupport && len > 1) {
					node = nodesUnq[0];
					parentOld = self.getParent(node);
					dataOld = parentOld ? parentOld[childstr] : roots;
					indxOld = dataOld.indexOf(node);
					for (i = 1; i < len; i++) {
						if (dataOld[i + indxOld] != nodesUnq[i]) {
							historySupport = false;
							break
						}
					}
				}
				for (i = 0; i < len; i++) {
					node = nodesUnq[i];
					parentOld = self.getParent(node);
					dataOld = parentOld ? parentOld[childstr] : roots;
					indxOld = dataOld.indexOf(node);
					if (parentOld == parentNew) {
						indx = pq.moveItem(node, dataNew, indxOld, indx)
					} else {
						dataNew.splice(indx++, 0, node);
						dataOld.splice(indxOld, 1)
					}
					if (TM.leafIfEmpty && parentOld && self.isEmpty(parentOld)) {
						self.makeLeaf(parentOld)
					}
					node[parentIdstr] = parentNewId
				}
				if (TM.historyMove && historySupport) that.iHistory.push({
					callback: function(redo) {
						var indxOld3 = indxOld;
						if (parentNew == parentOld && indxOld3 > indxOrig) {
							indxOld3 += 1
						}
						self.moveNodes(nodes, redo ? parentNew : parentOld, redo ? indxOrig : indxOld3, true)
					}
				});
				DM.data = self.flatten(roots);
				that.refreshView();
				that._trigger("moveNode", null, {
					args: args
				})
			}
		},
		off: function() {
			var obj = this.fns,
				that = this.that,
				key;
			for (key in obj) {
				that.off(key, obj[key])
			}
			this.fns = {}
		},
		on: function(evt, fn) {
			this.fns[evt] = fn;
			this.that.on(evt, fn);
			return this
		},
		onCellClick: function(evt, ui) {
			var self = this;
			if (ui.dataIndx == self.dataIndx && $(evt.originalEvent.target).hasClass("pq-group-icon")) {
				if (pq.isCtrl(evt)) {
					var rd = ui.rowData;
					self[rd.pq_close ? "expandAll" : "collapseAll"]()
				} else {
					self.toggleNode(ui.rowData, evt)
				}
			}
		},
		onBeforeCellKeyDown: function(evt, ui) {
			var self = this,
				that = self.that,
				rd = ui.rowData,
				$inp, di = ui.dataIndx,
				close, keyCode = evt.keyCode,
				KC = $.ui.keyCode;
			if (di == self.dataIndx) {
				if (self.isFolder(rd)) {
					close = rd.pq_close;
					if (keyCode == KC.ENTER && !that.isEditable({
							rowIndx: rd.pq_ri,
							dataIndx: di
						}) || !close && keyCode == KC.LEFT || close && keyCode == KC.RIGHT) {
						self.toggleNode(rd);
						return false
					}
				}
				if (keyCode == KC.SPACE) {
					$inp = that.getCell(ui).find("input[type='checkbox']");
					if ($inp.length) {
						$inp.click();
						return false
					}
				}
			}
		},
		hasSummary: function() {
			var T = this.Model;
			return T.summary || T.summaryInTitleRow
		},
		onChange: function(self, that, TM) {
			return function(evt, ui) {
				var source = ui.source || "",
					addListLen = ui.addList.length,
					deleteList = ui.deleteList,
					deleteListLen = deleteList.length;
				if (source.indexOf("checkbox") == -1) {
					if ((source == "undo" || source == "redo" || source == "rollback") && (addListLen || deleteListLen)) {
						self.refreshViewFull()
					} else if (self.hasSummary() && TM.refreshOnChange && !addListLen && !deleteListLen) {
						self.refreshSummary(true);
						that.refresh()
					} else if (source == "addNodes" || source == "deleteNodes") {
						self.refreshViewFull()
					}
					if (TM.leafIfEmpty) {
						deleteList.forEach(function(obj) {
							var parent = self.getParent(obj.rowData);
							if (parent && self.isEmpty(parent)) self.makeLeaf(parent)
						})
					}
				}
			}
		},
		clearFolderCheckbox: function(data) {
			var self = this,
				cbId = self.cbId;
			data.forEach(function(node) {
				if (self.isFolder(node)) {
					delete node[cbId]
				}
			})
		},
		onClearFilter: function(evt, ui) {
			var self = this;
			self.clearFolderCheckbox(ui.data);
			ui.data = self.groupById(ui.data);
			return false
		},
		onCustomFilter: function(evt, ui) {
			var self = this,
				that = self.that,
				data = self.groupById(ui.data),
				iF = that.iFilterData,
				arrS = ui.filters,
				dataTmp = [],
				dataUF = [],
				FMmode = ui.mode;
			self.filter(self.getRoots(data), arrS, iF, FMmode, dataTmp, dataUF, ui.hideRows);
			ui.dataTmp = self.groupById(dataTmp);
			ui.dataUF = dataUF;
			self.clearFolderCheckbox(ui.dataTmp);
			return false
		},
		onDataAvailable: function() {
			this.initData()
		},
		refreshSummary: function(showHideRows) {
			var self = this;
			self.summaryT();
			self.that.iRefresh.addRowIndx();
			showHideRows && self.showHideRows()
		},
		onDataReadyAfter: function() {
			var self = this,
				that = self.that,
				o = that.options,
				DM = o.dataModel,
				TM = self.Model;
			if (self.hasSummary()) {
				if (!TM.filterLockSummary || !TM.summaryInTitleRow || !DM.dataUF.length) self.refreshSummary()
			}
			self.showHideRows();
			if (self.isCascade(TM)) {
				self.cascadeInit()
			}
		},
		option: function(ui, refresh) {
			var self = this,
				that = self.that,
				TM = self.Model,
				di_prev = TM.dataIndx,
				di;
			$.extend(TM, ui);
			di = TM.dataIndx;
			self.setCellRender();
			self.init();
			if (!di_prev && di) {
				self.initData()
			}
			refresh !== false && that.refreshView()
		},
		renderCell: function(self, TM) {
			return function(ui) {
				var rd = ui.rowData,
					that = self.that,
					indent = TM.indent,
					o = that.options,
					rtl = o.rtl,
					left = rtl ? "right" : "left",
					label, column = ui.column,
					render = column.renderLabel || TM.render,
					iconCollapse = TM.iconCollapse,
					checkbox = TM.checkbox,
					isFolder = self.isFolder(rd),
					iconCls = self._iconCls(rd, isFolder, TM),
					level = rd.pq_level || 0,
					leftFolder = level * indent + indent / 2 - 5,
					icon, _icon, icon2, clsArr = ["pq-group-title-cell"],
					attr, styleArr = ["text-indent:", (level + 1) * indent - 3, "px;"],
					text = ui.formatVal || ui.cellData,
					arrCB, chk;
				if (render) {
					var ret = that.callFn(render, ui);
					if (ret != null) {
						if (typeof ret != "string") {
							ret.iconCls && (iconCls = ret.iconCls);
							ret.text != null && (text = ret.text);
							attr = ret.attr;
							clsArr.push(ret.cls);
							styleArr.push(ret.style)
						} else {
							text = ret
						}
					}
				}
				if (ui.Export) {
					return self.exportCell(text, level)
				} else {
					if (checkbox) {
						arrCB = self.renderCB(checkbox, rd, TM.cbId);
						if (arrCB) {
							chk = arrCB[0];
							if (arrCB[1]) clsArr.push(arrCB[1])
						}
					}
					if (isFolder) {
						_icon = rd.pq_close ? iconCollapse[1] : iconCollapse[0];
						icon = "<span style='position:absolute;" + left + ":" + leftFolder + "px;top:6px;' class='pq-group-icon ui-icon " + _icon + "'></span>"
					}
					if (iconCls) {
						icon2 = "<span class='pq-tree-icon ui-icon " + iconCls + "'></span>"
					}
					label = chk && (column.useLabel || TM.useLabel);
					return {
						cls: clsArr.join(" "),
						attr: attr,
						outer: TM.hideLines ? "" : self.getLines(isFolder, rd, level, indent, left),
						style: styleArr.join(""),
						text: [icon, icon2, label ? "<label>" : "", chk, text, label ? "</label>" : ""].join("")
					}
				}
			}
		},
		refreshViewFull: function(full) {
			var self = this,
				DM = self.that.options.dataModel;
			DM.data = self.groupById(DM.data);
			self.buildCache();
			full && self.refreshView()
		},
		_iconCls: function(rd, isFolder, TM) {
			if (TM.icons) {
				var iconFolder;
				if (isFolder && (iconFolder = TM.iconFolder)) {
					return rd.pq_close ? iconFolder[1] : iconFolder[0]
				} else if (!rd.pq_gsummary) {
					return TM.iconFile
				}
			}
		},
		setCellRender: function() {
			var self = this,
				that = self.that,
				TM = self.Model,
				di, column, columns = that.columns;
			TM.summary && that.iGroup.refreshColumns();
			if (di = self.di_prev) {
				column = columns[di];
				column && (column._render = null);
				self.di_prev = null
			}
			if (di = TM.dataIndx) {
				column = columns[di];
				column._render = self.renderCell(self, TM);
				self.di_prev = di
			}
		},
		_showHideRows: function(p_data, _data, _hide) {
			var self = this,
				idstr = self.id,
				state = self.nodeClose,
				stateKey, stateClose, data = _data || self.getRoots(),
				childstr = self.childstr,
				rd, hidec, hide = _hide || false,
				children, len = data.length,
				i = 0;
			for (; i < len; i++) {
				rd = data[i];
				if (!rd.pq_filter) rd.pq_hidden = hide;
				if (children = rd[childstr]) {
					if (state) {
						stateKey = rd[idstr];
						stateClose = state[stateKey];
						if (stateClose != null) {
							delete state[stateKey];
							rd.pq_close = stateClose
						}
					}
					hidec = hide || rd.pq_close;
					self._showHideRows(p_data, children, hidec)
				}
			}
		},
		showHideRows: function() {
			var self = this,
				that = self.that,
				i = 0,
				parent, data = that.get_p_data(),
				len, rd, summary = self.Model.summary;
			self._showHideRows(data);
			if (summary) {
				data = that.pdata;
				len = data.length;
				for (; i < len; i++) {
					rd = data[i];
					if (rd.pq_gsummary && (parent = self.getParent(rd))) {
						rd.pq_hidden = parent.pq_hidden
					}
				}
			}
		},
		toggleNode: function(rd, evt) {
			this[rd.pq_close ? "expandNodes" : "collapseNodes"]([rd], evt)
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fn = _pq.pqGrid.prototype,
		cRows = function(that) {
			this.that = that;
			var o = that.options;
			this.options = o;
			this.selection = [];
			this.hclass = " pq-state-select ui-state-highlight"
		};
	_pq.cRows = cRows;
	fn.SelectRow = function() {
		return this.iRows
	};
	cRows.prototype = {
		_add: function(row, remove) {
			var that = this.that,
				$tr, rowIndxPage = row.rowIndxPage,
				add = !remove,
				rowData = row.rowData,
				inView = this.inViewRow(rowIndxPage);
			if (!rowData.pq_hidden && inView) {
				$tr = that.getRow(row);
				if ($tr.length) {
					$tr[add ? "addClass" : "removeClass"](this.hclass);
					!add && $tr.removeAttr("tabindex")
				}
			}
			rowData.pq_rowselect = add;
			return row
		},
		_data: function(ui) {
			ui = ui || {};
			var that = this.that,
				all = ui.all,
				offset = that.riOffset,
				ri = all ? 0 : offset,
				data = that.get_p_data(),
				len = all ? data.length : that.pdata.length,
				end = ri + len;
			return [data, ri, end]
		},
		add: function(objP) {
			var rows = objP.addList = objP.rows || [{
				rowIndx: objP.rowIndx
			}];
			if (objP.isFirst) {
				this.setFirst(rows[0].rowIndx)
			}
			this.update(objP)
		},
		extend: function(objP) {
			var r2 = objP.rowIndx,
				arr = [],
				i, item, begin, end, r1 = this.getFirst(),
				isSelected;
			if (r1 != null) {
				isSelected = this.isSelected({
					rowIndx: r1
				});
				if (isSelected == null) {
					return
				}
				if (r1 > r2) {
					r1 = [r2, r2 = r1][0];
					begin = r1;
					end = r2 - 1
				} else {
					begin = r1 + 1;
					end = r2
				}
				for (i = begin; i <= end; i++) {
					item = {
						rowIndx: i
					};
					arr.push(item)
				}
				this.update(isSelected ? {
					addList: arr
				} : {
					deleteList: arr
				})
			}
		},
		getFirst: function() {
			return this._firstR
		},
		getSelection: function() {
			var that = this.that,
				data = that.get_p_data(),
				rd, i = 0,
				len = data.length,
				rows = [];
			for (; i < len; i++) {
				rd = data[i];
				if (rd && rd.pq_rowselect) {
					rows.push({
						rowIndx: i,
						rowData: rd
					})
				}
			}
			return rows
		},
		inViewCol: function(ci) {
			var that = this.that,
				options = that.options,
				iR = that.iRenderB,
				fc = options.freezeCols;
			if (ci < fc) {
				return true
			}
			return ci >= iR.initH && ci <= iR.finalH
		},
		inViewRow: function(rowIndxPage) {
			var that = this.that,
				options = that.options,
				iR = that.iRenderB,
				freezeRows = options.freezeRows;
			if (rowIndxPage < freezeRows) {
				return true
			}
			return rowIndxPage >= iR.initV && rowIndxPage <= iR.finalV
		},
		isSelected: function(objP) {
			var rowData = objP.rowData || this.that.getRowData(objP);
			return rowData ? rowData.pq_rowselect === true : null
		},
		isSelectedAll: function(ui) {
			var arr = this._data(ui),
				data = arr[0],
				ri = arr[1],
				end = arr[2],
				rd;
			for (; ri < end; ri++) {
				rd = data[ri];
				if (rd && !rd.pq_rowselect) {
					return false
				}
			}
			return true
		},
		removeAll: function(ui) {
			this.selectAll(ui, true)
		},
		remove: function(objP) {
			var rows = objP.deleteList = objP.rows || [{
				rowIndx: objP.rowIndx
			}];
			if (objP.isFirst) {
				this.setFirst(rows[0].rowIndx)
			}
			this.update(objP)
		},
		replace: function(ui) {
			ui.deleteList = this.getSelection();
			this.add(ui)
		},
		selectAll: function(_ui, remove) {
			var that = this.that,
				rd, rows = [],
				offset = that.riOffset,
				arr = this._data(_ui),
				data = arr[0],
				ri = arr[1],
				end = arr[2];
			for (; ri < end; ri++) {
				rd = data[ri];
				if (rd) {
					rows.push({
						rowIndx: ri,
						rowIndxPage: ri - offset,
						rowData: rd
					})
				}
			}
			this.update(remove ? {
				deleteList: rows
			} : {
				addList: rows
			}, true)
		},
		setFirst: function(v) {
			this._firstR = v
		},
		toRange: function() {
			var areas = [],
				that = this.that,
				data = that.get_p_data(),
				rd, i = 0,
				len = data.length,
				r1, r2;
			for (; i < len; i++) {
				rd = data[i];
				if (rd.pq_rowselect) {
					if (r1 != null) {
						r2 = i
					} else {
						r1 = r2 = i
					}
				} else if (r1 != null) {
					areas.push({
						r1: r1,
						r2: r2
					});
					r1 = r2 = null
				}
			}
			if (r1 != null) {
				areas.push({
					r1: r1,
					r2: r2
				})
			}
			return that.Range(areas)
		},
		toggle: function(ui) {
			this[this.isSelected(ui) ? "remove" : "add"](ui)
		},
		toggleAll: function(ui) {
			this[this.isSelectedAll(ui) ? "removeAll" : "selectAll"](ui)
		},
		update: function(objP, normalized) {
			var self = this,
				that = self.that,
				ui = {
					source: objP.source
				},
				norm = function(list) {
					return normalized ? list : that.normalizeList(list)
				},
				addList = norm(objP.addList || []),
				deleteList = norm(objP.deleteList || []);
			addList = addList.filter(function(rObj) {
				return self.isSelected(rObj) === false
			});
			deleteList = deleteList.filter(self.isSelected.bind(self));
			if (addList.length || deleteList.length) {
				ui.addList = addList;
				ui.deleteList = deleteList;
				if (that._trigger("beforeRowSelect", null, ui) === false) {
					return
				}
				ui.addList.forEach(function(rObj) {
					self._add(rObj)
				});
				ui.deleteList.forEach(function(rObj) {
					self._add(rObj, true)
				});
				that._trigger("rowSelect", null, ui)
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iImport = new cImport(grid)
	});
	_pq.pqGrid.prototype.importWb = function(obj) {
		return this.iImport.importWb(obj)
	};
	var cImport = _pq.cImport = function(that) {
		this.that = that
	};
	cImport.prototype = {
		fillRows: function(data, i, obj) {
			var j = data.length;
			for (; j < i; j++) {
				data.push(obj ? {} : [])
			}
		},
		generateCols: function(numCols, columns, CMrow) {
			var CM = [],
				i = 0,
				column1, column2, indx = 0,
				colWidthDefault = pq.excel.colWidth,
				CMrowCells = [],
				cells = CMrow ? CMrow.cells : [],
				titles = [];
			cells.forEach(function(cell, i) {
				var indx = cell.indx || i;
				titles[indx] = cell.value;
				CMrowCells[indx] = cell
			});
			columns = columns || [];
			columns.forEach(function(col, i) {
				indx = col.indx || i;
				CM[indx] = col
			});
			numCols = Math.max(numCols, columns.length, indx + 1);
			for (; i < numCols; i++) {
				column1 = CM[i] || {};
				column2 = {
					_title: titles[i] || "",
					title: this._render,
					width: column1.width || colWidthDefault,
					style: {},
					styleHead: {},
					halign: "center"
				};
				this.copyStyle(column1, column2, column2.style);
				this.copyStyle(CMrowCells[i] || {}, {}, column2.styleHead);
				column1.hidden && (column2.hidden = true);
				CM[i] = column2
			}
			return CM
		},
		_render: function(ui) {
			return ui.column._title || pq.toLetter(ui.colIndx)
		},
		importS: function(sheet, extraRows, extraCols, keepCM, headerRowIndx) {
			var mergeCells = sheet.mergeCells,
				self = this,
				data = [],
				options = {},
				that = self.that,
				numCols = 0,
				rows = sheet.rows || [],
				frozenRows = sheet.frozenRows || 0,
				len = rows.length,
				i = 0,
				row, rindx, rd, cindx, di, CMrow, prop = "pq_cellprop",
				cellprop, style = "pq_cellstyle",
				cellstyle, attr = "pq_cellattr",
				attr2, rowstyle, rowprop, tmp, propObj, styleObj, CM = that.colModel,
				hriOffset = 0,
				formula, CMExists = CM && CM.length,
				shiftRC = _pq.cFormulas.shiftRC();
			if (headerRowIndx != null) {
				hriOffset = headerRowIndx + 1;
				CMrow = rows[headerRowIndx];
				numCols = CMrow.cells.length;
				rows = rows.slice(hriOffset);
				rows.forEach(function(row) {
					if (row.indx != null) {
						row.indx -= hriOffset
					}
				});
				frozenRows = frozenRows - hriOffset;
				frozenRows = frozenRows > 0 ? frozenRows : 0
			}
			for (i = 0, len = rows.length; i < len; i++) {
				row = rows[i];
				rindx = row.indx || i;
				rd = {};
				cellprop = rd[prop] = {};
				cellstyle = rd[style] = {};
				attr2 = rd[attr] = {};
				rowstyle = rd.pq_rowstyle = {};
				rowprop = rd.pq_rowprop = {};
				self.copyStyle(row, rowprop, rowstyle);
				if (rindx != i) {
					self.fillRows(data, rindx, true)
				}(row.cells || []).forEach(function(cell, j) {
					cindx = cell.indx || j;
					di = keepCM && CMExists && CM[cindx] ? CM[cindx].dataIndx : cindx;
					rd[di] = cell.value;
					propObj = cellprop[di] = {};
					styleObj = cellstyle[di] = {};
					self.copyStyle(cell, propObj, styleObj);
					if (tmp = cell.comment) attr2[di] = {
						title: tmp
					};
					if (tmp = cell.link) {
						propObj.link = tmp
					}
					formula = cell.formula;
					if (formula) {
						self.copyFormula(rd, di, hriOffset ? shiftRC(formula, 0, -hriOffset) : formula)
					}
					numCols <= cindx && (numCols = cindx + 1)
				});
				if (row.htFix >= 0) {
					rd.pq_ht = row.htFix;
					rd.pq_htfix = true
				}
				row.hidden && (rd.pq_hidden = true);
				data[rindx] = rd
			}
			options.title = sheet.name;

			function getXtraRowsCols(dataLen, indx, cx, htRow) {
				var xtra = 0;
				(sheet.charts || []).concat(sheet.pics || []).forEach(chart => {
					var fromri = chart.from[indx],
						tori = chart.to ? chart.to[indx] : chart[cx] / htRow + fromri;
					xtra = Math.max(Math.max(dataLen, fromri + 1, tori + 1) - dataLen, xtra)
				});
				return xtra
			}
			extraRows = (extraRows || 0) + getXtraRowsCols(data.length, 2, "cy", 20);
			extraCols = (extraCols || 0) + getXtraRowsCols(numCols, 0, "cx", 50);
			extraRows && self.fillRows(data, data.length + extraRows, true);
			options.dataModel = {
				data: data
			};
			numCols += extraCols || 0;
			if (!keepCM && numCols) {
				options.colModel = self.generateCols(numCols, sheet.columns, CMrow)
			}
			options.mergeCells = (mergeCells || []).map(function(mc) {
				var add = pq.getAddress(mc);
				add.r1 -= hriOffset;
				add.r2 -= hriOffset;
				return add
			}).filter(function(mc) {
				return mc.r1 >= 0
			});
			options.freezeRows = frozenRows;
			options.freezeCols = sheet.frozenCols;
			options.pics = sheet.pics;
			options.charts = sheet.charts || [];
			return options
		},
		copyFormula: function(rd, di, formula) {
			var pq_fn = rd.pq_fn = rd.pq_fn || {};
			pq_fn[di] = formula
		},
		copyStyle: function(cell, prop, style) {
			var tmp, key, obj;
			(tmp = cell.font) != null && (style["font-family"] = tmp);
			(tmp = cell.fontSize) != null && (style["font-size"] = tmp ? tmp + "pt" : tmp);
			(tmp = cell.color) != null && (style.color = tmp);
			(tmp = cell.bgColor) != null && (style["background-color"] = tmp);
			if ((tmp = cell.bold) != null) style["font-weight"] = tmp ? "bold" : tmp;
			if ((tmp = cell.italic) != null) style["font-style"] = tmp ? "italic" : tmp;
			if ((tmp = cell.underline) != null) style["text-decoration"] = tmp ? "underline" : tmp;
			if ((tmp = cell.wrap) != null) style["white-space"] = tmp ? "normal" : "";
			(tmp = cell.align) != null && (prop.align = tmp);
			(tmp = cell.valign) != null && (prop.valign = tmp);
			if ((tmp = cell.format) != null) {
				prop.format = tmp
			}
			if (tmp = cell.border)
				for (key in tmp) {
					obj = tmp[key];
					style["border-" + key] = obj
				}
		},
		applyOptions: function(main, options) {
			var DM = main.options.dataModel,
				DM2 = options.dataModel;
			if (DM2) {
				for (var key in DM2) {
					DM[key] = DM2[key]
				}
				delete options.dataModel
			}
			main.option(options)
		},
		importWb: function(obj) {
			var w = obj.workbook,
				activeId = w.activeId || 0,
				self = this,
				Tab = self.that.iTab,
				tabs = Tab.tabs(),
				main = Tab.main(),
				sheet = obj.sheet,
				s, op = function(s) {
					return self.importS(s, obj.extraRows, obj.extraCols, obj.keepCM, obj.headerRowIndx)
				},
				fn = function(options) {
					self.applyOptions(main, options)
				};
			if (tabs) {
				Tab.clear();
				w.sheets.forEach(function(_sheet, i) {
					var tab = {
						sheet: _sheet,
						extraRows: obj.extraRows,
						extraCols: obj.extraCols,
						name: _sheet.name,
						hidden: _sheet.hidden
					};
					tabs.push(tab);
					if (i == activeId) {
						tab._inst = main;
						fn(op(_sheet))
					}
				});
				Tab.model.activeId = activeId;
				main._trigger("tabsReady");
				main.element.show();
				Tab.refresh()
			} else {
				sheet = sheet || 0;
				s = w.sheets.filter(function(_sheet, i) {
					return sheet == i || sheet && sheet == _sheet.name
				})[0];
				if (s) {
					fn(op(s))
				}
			}
			main._trigger("importWb");
			main.refreshDataAndView()
		}
	}
})(jQuery);
(function($) {
	pq.excelImport = {
		attr: function() {
			var re = new RegExp('([a-z]+)\\s*=\\s*"([^"]*)"', "gi");
			return function(str) {
				str = str || "";
				str = str.slice(0, str.indexOf(">"));
				var attrs = {};
				str.replace(re, function(a, b, c) {
					attrs[b] = c
				});
				return attrs
			}
		}(),
		getComment: function($sheetrel) {
			var self = this,
				commentObj = {},
				target;
			if ($sheetrel.length) {
				target = $($sheetrel.find('Relationship[Type*="/comments"]')[0]).attr("Target");
				if (target) {
					target = target.split("/").pop();
					var $c = self.getFileText("xl/" + target),
						comments = $c.match(/<comment\s+[^>]*>([\s\S]*?)<\/comment>/g) || [];
					comments.forEach(function(c) {
						var key = self.attr(c).ref,
							arr = c.match(/<t(\s+[^>]*)?>([\s\S]*?)(?=<\/t>)/g),
							val = self.match(arr[arr.length - 1], /[^>]*>([\s\S]*)/, 1);
						commentObj[key] = pq.unescapeXml($.trim(val))
					})
				}
			}
			return commentObj
		},
		getLinks: function($sheet, $sheetrel) {
			var linkObj = {},
				self = this,
				links;
			if ($sheetrel.length) {
				links = $sheet.match(/<hyperlink[^s](.*?)\/>/g) || [];
				links.forEach(function(link) {
					var attr = self.attr(link),
						ref = attr.ref,
						id = attr.id,
						target = $sheetrel.find('Relationship[Type*="/hyperlink"][Id="' + id + '"]').attr("Target");
					if (target) linkObj[ref] = target
				})
			}
			return linkObj
		},
		getPic: function($sheet, $sheetrel, sheetName) {
			var self = this,
				key, pics = [],
				charts = [],
				files = self.files,
				drwId = self.match($sheet, /<drawing\s+r:id=\"([^\"]*)\"(\s*)\/>/i, 1);
			if (drwId) {
				var drawing = $($sheetrel.find('Relationship[Id="' + drwId + '"]')[0]).attr("Target") || "",
					drawing = drawing.split("/").pop(),
					fname, objFNames = {},
					$r, objSrc = {},
					factor = 9500,
					div, $draw = self.pxml("xl/drawings/" + drawing),
					$rel = self.pxml("xl/drawings/_rels/" + drawing + ".rels"),
					arr = ["col", "colOff", "row", "rowOff"];
				$rel.find("Relationship[Type*='/image']").each(function(i, r) {
					$r = $(r);
					var m = $r.attr("Target").match(/media\/(.*)/);
					if (m && m[1]) {
						objFNames[$r.attr("Id")] = m[1]
					}
				});
				for (key in files) {
					if (/media\/.*/.test(key)) {
						fname = key.match(/media\/(.*)/)[1];
						objSrc[fname] = self.getBase64(files[key])
					}
				}
				$draw.find("xdr\\:twoCellAnchor,xdr\\:oneCellAnchor").each(function(i, anchor) {
					var $anchor = $(anchor),
						cnvpr = $anchor.find("xdr\\:cNvPr"),
						oname = cnvpr.attr("descr"),
						id = cnvpr.attr("id"),
						rid = $anchor.find("a\\:blip").attr("r:embed"),
						fname = objFNames[rid],
						$from = $anchor.find("xdr\\:from"),
						$to = $anchor.find("xdr\\:to"),
						$ext = $anchor.find("xdr\\:ext"),
						toLen = $to.length,
						from = [],
						to = toLen ? [] : null,
						chartRId = $anchor.find("c\\:chart,cx\\:chart").attr("r:id"),
						isChartEx = $anchor.find("cx\\:chart").length,
						cx = $ext.attr("cx") / factor,
						cy = $ext.attr("cy") / factor;
					arr.forEach(function(col, j) {
						div = j % 2 ? factor : 1;
						from.push($from.find("xdr\\:" + col).text() / div);
						toLen && to.push($to.find("xdr\\:" + col).text() / div)
					});
					if (chartRId) {} else {
						if (oname || fname) {
							pics.push({
								id: id,
								name: oname || fname,
								src: objSrc[fname],
								from: from,
								to: to,
								cx: toLen ? 0 : cx,
								cy: toLen ? 0 : cy
							})
						}
					}
				})
			}
			return [pics, charts]
		},
		getBase64: function(zipObject) {
			var base64 = JSZip.base64.encode(zipObject.asBinary());
			return "data:image/png;base64," + base64
		},
		pxml: function(path) {
			return $($.parseXML(this.getFileText(path)))
		},
		pxmlstr: function(str) {
			return $($.parseXML($.trim(str)))
		},
		cacheTheme: function() {
			var self = this,
				$doc = self.pxmlstr(self.getFileTextFromKey("th")),
				$a = $doc.find("a\\:clrScheme"),
				$aa = $a.children(),
				arr = self.themeColor = ["FFFFFF", "000000"],
				arr2 = self.accentColors = {};
			$aa.each(function(i, a) {
				var $c = $(a).children(),
					val, nodeName = a.nodeName.replace("a:", "");
				if (i > 1) {
					val = $c.attr("val");
					if (i == 2) arr[3] = val;
					else if (i == 3) arr[2] = val;
					else arr[i] = val
				} else {
					val = $c.attr("lastClr") || $c.attr("val")
				}
				arr2[nodeName] = val
			});
			arr2.bg1 = arr2.lt1;
			arr2.bg2 = arr2.lt2;
			arr2.tx1 = arr2.dk1;
			arr2.tx2 = arr2.dk2
		},
		colorFromNode: function(node) {
			var self = this,
				attrs = node.attributes,
				color, tint, i = 0;
			for (; i < attrs.length; i++) {
				var attr = attrs[i],
					name = attr.name,
					value = attr.value;
				if (name == "indexed") {
					color = self.indexes[value]
				} else if (name == "rgb") {
					color = value.slice(2)
				} else if (name == "theme") {
					color = self.themeColor[value]
				} else if (name == "tint") {
					tint = value
				}
			}
			if (color) {
				if (tint) color = pq.tint(color, tint);
				return "#" + color
			}
		},
		indexes: ["000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF", "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF", "800000", "008000", "000080", "808000", "800080", "008080", "C0C0C0", "808080", "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF", "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF", "00CCFF", "CCFFFF", "CCFFCC", "FFFF99", "99CCFF", "FF99CC", "CC99FF", "FFCC99", "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696", "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333", "000000"],
		cacheStyles: function() {
			var self = this,
				fontSizeDefault, fontDefault, format, $styles = self.pxmlstr(self.getStyleText()),
				formats = $.extend(true, {}, self.preDefFormats),
				styles = [],
				fonts = [],
				fills = ["", ""],
				borders = [];
			$styles.find("numFmts>numFmt").each(function(i, numFmt) {
				var $numFmt = $(numFmt),
					f2, f = f2 = $numFmt.attr("formatCode");
				formats[$numFmt.attr("numFmtId")] = f2
			});
			$styles.find("fills>fill>patternFill>fgColor").each(function(i, fgColor) {
				fills.push(self.colorFromNode(fgColor))
			});
			var bwidth = {
					double: "3px",
					thick: "3px",
					medium: "2px"
				},
				bstyle = {
					thin: "solid",
					medium: "solid",
					thick: "solid",
					hair: "dotted"
				};
			$styles.find("borders>border").each(function(i, b) {
				var $b = $(b).children(),
					bb = {},
					double = "double";
				$b.each(function(j, bl) {
					var $bl = $(bl),
						style, $c = $bl.children(),
						c = $c[0];
					if (c) {
						style = $bl.attr("style");
						bb[bl.tagName] = (bwidth[style] || "1px") + " " + (bstyle[style] || style) + " " + (self.colorFromNode(c) || "#000000")
					}
				});
				borders.push(bb)
			});
			$styles.find("fonts>font").each(function(i, font) {
				var $font = $(font),
					fontSize = $font.find("sz").attr("val") * 1,
					_font = $font.find("name").attr("val"),
					color = $font.find("color")[0],
					fontObj = {};
				if ($font.find("b").length) fontObj.bold = true;
				if (color && (color = self.colorFromNode(color))) fontObj.color = color;
				if (_font && _font.toUpperCase() != fontDefault) fontObj.font = _font;
				if (fontSize && fontSize != fontSizeDefault) fontObj.fontSize = fontSize;
				if ($font.find("u").length) fontObj.underline = true;
				if ($font.find("i").length) fontObj.italic = true;
				fonts.push(fontObj)
			});
			$styles.find("cellXfs>xf").each(function(i, xf) {
				var $xf = $(xf),
					numFmtId = $xf.attr("numFmtId") * 1,
					fillId = $xf.attr("fillId") * 1,
					borderId = $xf.attr("borderId") * 1,
					$align = $xf.children("alignment"),
					align, valign, wrap, fontId = $xf.attr("fontId") * 1,
					key, fontObj = fontId == null ? {} : fonts[fontId],
					style = {};
				if ($align.length) {
					align = $align.attr("horizontal");
					align && (style.align = align);
					valign = $align.attr("vertical");
					valign && (style.valign = valign);
					wrap = $align.attr("wrapText");
					wrap == "1" && (style.wrap = true)
				}
				if (numFmtId) {
					format = formats[numFmtId];
					style.format = format
				}
				if (borderId) {
					style.border = borders[borderId]
				}
				if (fillId && fills[fillId]) {
					style.bgColor = fills[fillId]
				}
				for (key in fontObj) {
					style[key] = fontObj[key]
				}
				styles.push(style)
			});
			self.getStyle = function(s) {
				return styles[s]
			};
			$styles = 0
		},
		getMergeCells: function($sheet) {
			var self = this,
				mergeCells = $sheet.match(/<mergeCell\s+.*?(\/>|<\/mergeCell>)/g) || [];
			return mergeCells.map(function(mc) {
				return self.attr(mc).ref
			})
		},
		getFrozen: function($sheet) {
			var $pane = this.match($sheet, /<pane.*?(\/>|<\/pane>)/, 0),
				attr = this.attr($pane),
				xSplit = attr.xSplit * 1,
				ySplit = attr.ySplit * 1;
			return {
				r: ySplit || 0,
				c: xSplit || 0
			}
		},
		getFormula: function(self) {
			var obj = {},
				shiftRC = $.paramquery.cFormulas.shiftRC();
			return function(children, ri, ci) {
				if (children.substr(0, 2) === "<f") {
					var f = self.match(children, /^<f.*?>(.*?)<\/f>/, 1),
						obj2, attr = self.attr(children);
					if (attr.t == "shared") {
						if (f) {
							obj[attr.si] = {
								r: ri,
								c: ci,
								f: f
							}
						} else {
							obj2 = obj[attr.si];
							f = shiftRC(obj2.f, ci - obj2.c, ri - obj2.r)
						}
					}
					if (f.indexOf("_xl") == 0) {
						f = f.split(".")[1]
					}
					return f
				}
			}
		},
		getCols: function($sheet) {
			var self = this,
				dim = ($sheet.match(/<dimension\s.*?\/>/) || [])[0],
				ref = self.attr(dim || "").ref,
				cols = [],
				$cols = $sheet.match(/<col\s.*?\/>/g) || [],
				clen = $cols.length,
				c2 = ref ? pq.getAddress(ref).c2 + 1 : 0,
				noCols = c2 || clen,
				factor = pq.excel.colRatio,
				indx;
			for (var j = 0; j < clen; j++) {
				var col = $cols[j],
					attrs = self.attr(col),
					min = attrs.min * 1,
					max = attrs.max * 1,
					hidden = attrs.hidden * 1,
					width = attrs.width * 1,
					_col, s = attrs.style,
					i = min,
					style = s ? self.getStyle(s) : {},
					key;
				if (c2) {
					if (j > noCols) break;
					max = Math.min(max, noCols)
				}
				for (; i <= max; i++) {
					_col = {};
					if (hidden) _col.hidden = true;
					else _col.width = (width * factor).toFixed(2) * 1;
					if (i !== cols.length + 1) {
						indx = i - 1;
						_col.indx = indx
					}
					for (key in style) _col[key] = style[key];
					cols.push(_col)
				}
			}
			return cols
		},
		getColor: function(color) {
			return "#" + color.slice(2)
		},
		getPath: function(key) {
			return this.paths[key]
		},
		getPathSheets: function() {
			return this.pathSheets
		},
		getFileTextFromKey: function(key) {
			return this.getFileText(this.getPath(key))
		},
		getFileText: function(path) {
			if (path) {
				var file = this.files[path.replace(/^\//, "")];
				return file ? file.asText().replace(/\<x\:/g, "<").replace(/\<\/x\:/g, "</") : ""
			} else {
				return ""
			}
		},
		getStyleText: function() {
			return this.getFileTextFromKey("st")
		},
		getSI: function(str) {
			var si = [],
				arr, unescapeXml = pq.unescapeXml,
				count = this.attr(this.match(str, /<sst.*?>[\s\S]*?<\/sst>/, 0)).uniqueCount * 1;
			str.replace(/<si>([\s\S]*?)<\/si>/g, function(a, b) {
				arr = [];
				b.replace(/<t.*?>([\s\S]*?)<\/t>/g, function(c, d) {
					arr.push(d)
				});
				si.push(unescapeXml(arr.join("")))
			});
			if (count && count !== si.length) {
				throw "si misatch"
			}
			return si
		},
		getCsv: function(text, separator) {
			var arr = [],
				rnd = Math.random() + "",
				separator;
			text = text.trim().replace(/(?:^|[^"]+)"(([^"]|"{2})+)"(?=([^"]+|$))/g, function(a, b) {
				var indx = a.indexOf(b);
				arr.push(b.replace(/""/g, '"'));
				return a.slice(0, indx - 1) + rnd + (arr.length - 1) + rnd
			});
			separator = separator || new RegExp(text.indexOf("\t") == -1 ? "," : "\t", "g");
			text = text.split(/\r\n|\r|\n/g);
			return {
				sheets: [{
					rows: text.map(function(row) {
						return {
							cells: row.split(separator).map(function(cell) {
								if (cell.indexOf(rnd) == 0) {
									var i = cell.slice(rnd.length, cell.indexOf(rnd, 1));
									cell = arr[i]
								} else if (cell === '""') cell = "";
								return {
									value: cell
								}
							})
						}
					})
				}]
			}
		},
		getWorkBook: function(buffer, type, sheets1) {
			var self = this,
				typeObj = {};
			if (type) typeObj[type] = true;
			else if (pq.isStr(buffer)) typeObj.base64 = true;
			self.files = new JSZip(buffer, typeObj).files;
			self.readPaths();
			self.cacheTheme();
			self.cacheStyles();
			var pathSS = this.getPath("ss"),
				sheets = [],
				si = pathSS ? this.getSI(this.getFileText(pathSS)) : [];
			self.getPathSheets().forEach(function(obj, i) {
				if (!sheets1 || sheets1.indexOf(i) > -1 || sheets1.indexOf(obj.name) > -1) {
					var $sheet = self.getFileText(obj.path),
						$sheetData = self.match($sheet, /<sheetData.*?>([\s\S]*?)<\/sheetData>/, 1),
						s = self.getWorkSheet($sheet, $sheetData, si, obj.name, i + 1);
					if (obj.hidden) s.hidden = true;
					sheets.push(s)
				}
			});
			delete self.files;
			return {
				sheets: sheets,
				activeId: self.activeId
			}
		},
		getWorkSheet: function($sheet, $sheetData, si, sheetName, indx) {
			var self = this,
				key, cell, f, format, cell2, $sheetrel = self.pxml("xl/worksheets/_rels/sheet" + indx + ".xml.rels"),
				comments = self.getComment($sheetrel),
				links = self.getLinks($sheet, $sheetrel),
				data = [],
				rd, cells, t, s, v, cr, num_cols = 0,
				ci, cell_children, rattr, cattr, toNumber = pq.toNumber,
				getFormula = self.getFormula(self),
				tmp, formulas = pq.formulas,
				isDateFormat = pq.isDateFormat,
				mc = self.getMergeCells($sheet),
				rows = $sheetData.match(/<row[^<]*?\/>|<row[\s\S]*?<\/row>/g) || [],
				columns = self.getCols($sheet),
				colObj = {},
				column, row, r, rowr, style, m, styleKeys = ["fontSize", "font", "color", "bgColor", "format", "align", "valign", "bold", "underline", "italic"],
				i = 0,
				rowsLen = rows.length;
			columns.forEach(function(col, i) {
				colObj[col.indx || i] = col
			});
			for (; i < rowsLen; i++) {
				rd = {
					cells: []
				};
				row = rows[i];
				rattr = self.attr(row);
				rowr = rattr.r;
				if (rattr.customHeight) {
					rd.htFix = rattr.ht * 1.5
				}
				s = rattr.s;
				style = s ? self.getStyle(s) : {};
				for (key in style) {
					rd[key] = style[key]
				}
				r = rowr ? rowr - 1 : i;
				r !== i && (rd.indx = r);
				rattr.hidden && (rd.hidden = true);
				cells = row.match(/(<c[^<]*?\/>|<c[\s\S]*?<\/c>)/gm) || [];
				for (var j = 0, cellsLen = cells.length; j < cellsLen; j++) {
					cell = cells[j];
					cattr = self.attr(cell);
					t = cattr.t;
					cell_children = self.match(cell, /<c.*?>([\s\S]*?)(<\/c>)?$/, 1);
					cell2 = {};
					if (t == "inlineStr") {
						m = cell_children.match(/<t><!\[CDATA\[([\s\S]*?)\]\]><\/t>/);
						if (m) v = m[1];
						else {
							m = cell_children.match(/<t>([\s\S]*?)<\/t>/);
							v = pq.unescapeXml(m[1])
						}
					} else {
						v = self.match(cell_children, /<v>(.*?)<\/v>/, 1) || undefined;
						if (v != null) {
							if (t == "s") {
								v = si[v]
							} else if (t == "str") {
								v = pq.unescapeXml(v)
							} else if (t == "b") {
								v = v == "1"
							} else {
								v = formulas.VALUE(v)
							}
						}
					}
					cr = cattr.r;
					if (cr) {
						ci = cr.replace(/\d+/, "");
						ci = toNumber(ci)
					} else {
						ci = j;
						cr = pq.toLetter(ci) + (r + 1)
					}
					if (comments[cr]) {
						cell2.comment = comments[cr]
					}
					if (links[cr]) {
						cell2.link = links[cr]
					}
					num_cols = num_cols > ci ? num_cols : ci;
					v !== undefined && (cell2.value = v);
					ci !== j && (cell2.indx = ci);
					f = getFormula(cell_children, r, ci);
					f && (cell2.formula = pq.unescapeXml(f));
					s = cattr.s;
					column = colObj[ci] || {};
					if (s && (s = this.getStyle(s))) {
						for (key in s) {
							tmp = s[key];
							if (column[key] !== tmp && rd[key] !== tmp) cell2[key] = tmp
						}
						format = cell2.format
					}
					styleKeys.forEach(function(key) {
						if ((column[key] || rd[key]) && (!s || !s[key])) {
							cell2[key] = ""
						}
					});
					rd.cells.push(cell2)
				}
				data.push(rd)
			}
			var picsCharts = self.getPic($sheet, $sheetrel, sheetName),
				sheetData = {
					rows: data,
					name: sheetName,
					pics: picsCharts[0]
				},
				frozen = self.getFrozen($sheet);
			sheetData.charts = picsCharts[1] || [];
			mc.length && (sheetData.mergeCells = mc);
			columns.length && (sheetData.columns = columns);
			frozen.r && (sheetData.frozenRows = frozen.r);
			frozen.c && (sheetData.frozenCols = frozen.c);
			return sheetData
		},
		Import: function(obj, fn) {
			var self = this,
				file = obj.file,
				content = obj.content,
				url = obj.url,
				csv = (url || (file || {}).name || "").slice(-3).toLowerCase() == "csv" || obj.csv,
				cb = function(data, type2) {
					fn(self[csv ? "getCsv" : "getWorkBook"](data, csv ? obj.separator : obj.type || type2, obj.sheets))
				};
			if (url) {
				url += "?" + Math.random();
				if (!window.Uint8Array) {
					JSZipUtils.getBinaryContent(url, function(err, data) {
						cb(data, "binary")
					})
				} else {
					pq.xmlhttp(url, csv ? "text" : "arraybuffer", cb)
				}
			} else if (file) {
				pq.fileRead(file, csv ? "readAsText" : "readAsArrayBuffer", cb)
			} else if (content) {
				cb(content)
			}
		},
		match: function(str, re, indx) {
			var m = str.match(re);
			return m ? m[indx] : ""
		},
		preDefFormats: {
			0: "",
			1: "0",
			2: "0.00",
			3: "#,##0",
			4: "#,##0.00",
			5: "$#,##0_);($#,##0)",
			6: "$#,##0_);[Red]($#,##0)",
			7: "$#,##0.00_);($#,##0.00)",
			8: "$#,##0.00_);[Red]($#,##0.00)",
			9: "0%",
			10: "0.00%",
			11: "0.00E+00",
			12: "# ?/?",
			13: "# ??/??",
			14: "m/d/yyyy",
			15: "d-mmm-yy",
			16: "d-mmm",
			17: "mmm-yy",
			18: "h:mm AM/PM",
			19: "h:mm:ss AM/PM",
			20: "h:mm",
			21: "h:mm:ss",
			22: "m/d/yyyy h:mm",
			37: "#,##0_);(#,##0)",
			38: "#,##0_);[Red](#,##0)",
			39: "#,##0.00_);(#,##0.00)",
			40: "#,##0.00_);[Red](#,##0.00)",
			45: "mm:ss",
			46: "[h]:mm:ss",
			47: "mm:ss.0",
			48: "##0.0E+0",
			49: "@"
		},
		readPaths: function() {
			var self = this,
				files = self.files,
				parser = new DOMParser,
				node, $ContentType = parser.parseFromString(files["[Content_Types].xml"].asText(), "application/xml"),
				key, paths = self.paths = {
					wb: "sheet.main",
					ws: "worksheet",
					st: "styles",
					ss: "sharedStrings",
					th: "theme"
				};
			for (key in paths) {
				node = $ContentType.querySelector('[ContentType$="' + paths[key] + '+xml"]');
				paths[key] = node ? node.getAttribute("PartName") : undefined
			}
			for (key in files) {
				if (/workbook.xml.rels$/.test(key)) {
					paths["wbrels"] = key;
					break
				}
			}
			var $wbrels = parser.parseFromString(self.getFileTextFromKey("wbrels"), "application/xml"),
				$w = parser.parseFromString(self.getFileTextFromKey("wb"), "application/xml"),
				pathSheets = self.pathSheets = [];
			self.activeId = $w.querySelector("workbookView").getAttribute("activeTab") * 1 || null;
			var relationshipsMap = {};
			var relationships = $wbrels.querySelectorAll("Relationship");
			relationships.forEach(function(node) {
				relationshipsMap[node.getAttribute("Id")] = node.getAttribute("Target")
			});
			var sheets = $w.querySelectorAll("sheet");
			sheets.forEach(function(sheet) {
				var rId = sheet.getAttribute("r:id"),
					name = sheet.getAttribute("name"),
					partial_path = relationshipsMap[rId],
					full_path = $ContentType.querySelector('Override[PartName$="' + partial_path + '"]').getAttribute("PartName");
				pathSheets.push({
					name: name,
					rId: rId,
					path: full_path,
					hidden: sheet.getAttribute("state") == "hidden"
				})
			});
			self.definedNames = {};
			var definedNames = $w.querySelectorAll("definedName") || [];
			definedNames.forEach(function(node) {
				self.definedNames[node.getAttribute("name")] = node.textContent
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		fn = _pq._pqGrid.prototype;
	fn.exportExcel = function(obj) {
		obj = obj || {};
		obj.format = "xlsx";
		return this.exportData(obj)
	};
	fn.exportCsv = function(obj) {
		obj = obj || {};
		obj.format = "csv";
		return this.exportData(obj)
	};
	fn.exportData = function(obj) {
		var e = new cExport(this, obj);
		return e.Export(obj)
	};
	var cExport = _pq.cExport = function(that) {
		this.that = that;
		that.Charts = _ => ({
			fcharts: []
		})
	};
	cExport.prototype = $.extend({
		copyStyle: function(cell, style, prop, colStyle, colProp) {
			colStyle = colStyle || {};
			colProp = colProp || {};
			var tmp, s = function(key) {
					var s = style[key];
					if (s && colStyle[key] != s) return s
				},
				p = function(key) {
					var s = prop[key];
					if (s && colProp[key] != s) return s
				};
			if (style) {
				style = pq.styleObj(style);
				if (tmp = s("background-color")) cell.bgColor = tmp;
				if (tmp = s("font-size")) cell.fontSize = parseFloat(tmp);
				if (tmp = s("color")) cell.color = tmp;
				if (tmp = s("font-family")) cell.font = tmp;
				if (tmp = s("font-weight")) cell.bold = tmp == "bold";
				if (tmp = s("white-space")) cell.wrap = tmp == "normal";
				if (tmp = s("font-style")) cell.italic = tmp == "italic";
				if (tmp = s("text-decoration")) cell.underline = tmp == "underline";
				var B = s("border");
				["left", "right", "top", "bottom"].forEach(function(l) {
					var b, border;
					if ((b = s("border-" + l)) || (b = B)) {
						border = cell.border = cell.border || {};
						border[l] = b
					}
				})
			}
			if (prop) {
				if (tmp = p("align")) cell.align = tmp;
				if (tmp = p("valign")) cell.valign = tmp
			}
		},
		getOCM: function(skipC, xHCols, _OCM) {
			var OCM = _OCM || this.that.options.colModel,
				CM, CM2 = [],
				CM3, col, hidden = xHCols ? undefined : false,
				len = OCM.length,
				i = 0;
			for (; i < len; i++) {
				col = OCM[i];
				CM = col.colModel;
				if (CM && CM.length) {
					CM3 = this.getOCM(skipC, xHCols, CM);
					if (CM3.length) {
						CM2.push(Object.assign({}, col, {
							colModel: CM3,
							hidden: hidden,
							collapsible: xHCols ? undefined : {}
						}))
					}
				} else if (!skipC(col)) {
					CM2.push(Object.assign({}, col, {
						hidden: hidden
					}))
				}
			}
			return CM2
		},
		Export(obj) {
			if (obj.workbook && obj.format == "xlsx") obj.format = "wb";
			var self = this,
				that = self.that,
				format = obj.format,
				isXlsx = format == "xlsx" || format == "wb",
				ret, Tab = that.Tab(),
				tabs = Tab.tabs(),
				activeTab_name, activeId, sheets = {},
				filterBySheet, wbsheets = [],
				wb = {
					sheets: wbsheets
				},
				sheet, instance, e;
			if (that._trigger("beforeExport", null, obj) === false) {
				return false
			}
			if (tabs) {
				activeTab_name = (Tab.activeTab() || {}).name;
				activeId = Tab.activeId();
				if (obj.activeSheet) {
					filterBySheet = 1;
					sheets[Tab.activeTab().name] = 1
				} else if (obj.sheets) {
					filterBySheet = 1;
					obj.sheets.forEach(function(sheet) {
						sheets[sheet] = 1
					})
				}
				for (var id = 0; id < tabs.length; id++) {
					var tab = tabs[id];
					if (!obj.skipHiddenSheets || !tab.hidden) {
						if (!filterBySheet || sheets[tab.name]) {
							instance = tab._inst;
							sheet = tab.sheet;
							if (!instance) {
								if (sheet && sheet.charts.length) {
									instance = that.iTab.activate(id);
									new Promise((resolve, reject) => {
										instance.one("chartCreate", _ => resolve())
									})
								} else if (!isXlsx || !sheet) {
									instance = that.iTab.create(id)
								}
							}
							if (!isXlsx || !sheet || sheet.charts.length) {
								e = new cExport(instance);
								sheet = e._Export(obj)
							}
							if (sheet) {
								if (activeTab_name == tab.name) {
									wb.activeId = wbsheets.length
								}
								sheet.name = tab.name;
								sheet.hidden = tab.hidden;
								wbsheets.push(sheet)
							}
						}
					}
				}
				if (activeId != Tab.activeId()) {
					Tab.activate(activeId)
				}
			} else {
				sheet = self._Export(obj);
				if (isXlsx) wbsheets[0] = sheet;
				else if (sheet) wb = sheet.content
			}
			if (isXlsx) {
				if (that._trigger("workbookReady", null, {
						workbook: wb
					}) === false) {
					return wb
				}
				if (format == "wb") {
					return wb
				}
				obj.workbook = wb;
				ret = pq.excel.exportWb(obj)
			} else {
				ret = wb
			}
			that._trigger("exportData", null, obj);
			return ret
		},
		_Export(obj) {
			var self = this,
				that = self.that,
				iMerge = that.iMerge,
				o = that.options,
				skipCI = self.skipCI = [],
				hc = self.hcForHead = that.headerCells,
				groupCols = hc.length - 1,
				skipRI = self.skipRI = [],
				xHCols = self.xHCols = obj.skipHiddenCols,
				xHRows = self.xHRows = obj.skipHiddenRows,
				iSel = that.Selection(),
				skipC = function(col) {
					return xHCols && col.hidden || col.skipExport || selected && selTypeCell && !isSelDI[col.dataIndx]
				},
				selected = obj.selection,
				selTypeRow = selected == "row",
				selTypeCell = selected && !selTypeRow,
				isSelRI = [],
				isSelDI = {},
				skipR = function(rd) {
					return xHRows && rd.pq_hidden || selected && (selTypeRow && !rd.pq_rowselect || selTypeCell && !isSelRI[rd.pq_ri])
				},
				CM_old = that.colModel;
			if (selected && selTypeCell) {
				iSel.eachRow(function(rd, rip) {
					isSelRI[rip] = true
				});
				iSel.eachCol(function(col) {
					isSelDI[col.dataIndx] = true
				})
			}
			CM_old.forEach(function(col, ci) {
				if (skipC(col)) skipCI[ci] = true
			});
			iMerge.init(skipC, skipR);
			if (skipCI.length && groupCols) {
				hc = self.hcForHead = that.Columns().getHeaderCells(self.getOCM(skipC, xHCols))[0];
				hc[hc.length - 1] = CM_old
			}
			var ret, GM = o.groupModel,
				remotePage = o.pageModel.type == "remote",
				CMR = that.colModel,
				TM = o.treeModel,
				curPage = self.curPage = GM.on && GM.dataIndx.length || remotePage || TM.dataIndx && TM.summary,
				data = curPage ? that.pdata : o.dataModel.data,
				data = o.summaryData ? data.concat(o.summaryData) : data,
				header = !obj.noheader,
				format = obj.format,
				sheet;
			if (xHRows || selected) {
				data.forEach(function(rd, ri) {
					if (skipR(rd)) skipRI[ri] = true
				})
			}
			if (format == "xlsx" || format == "wb") {
				sheet = self.getWorksheet(obj, data, CMR, header, hc)
			} else if (format == "json") {
				sheet = {
					content: self.getJsonContent(obj, data)
				}
			} else {
				var head = header ? self.getHead(obj) : [],
					body = self.getBody(obj, data),
					pics = that.getPics();
				if (format == "js") {
					ret = {
						head: head,
						body: body
					}
				} else {
					obj.grid = that;
					ret = pq[pq.camelCase("export-" + format)](head, body, obj)
				}
				sheet = {
					content: ret,
					pics: pics
				}
			}
			iMerge.init();
			if (sheet) sheet.name = obj.sheetName || o.title;
			return sheet
		},
		getHead: function(obj) {
			var self = this,
				that = self.that,
				eachCell = obj.eachCellHead,
				eachRow = obj.eachRowHead,
				hc = self.hcForHead,
				hcLen = hc.length,
				header = [],
				skipCI = self.skipCI,
				skipped = 0,
				tmp, cell, title, ri = 0;
			for (; ri < hcLen; ri++) {
				var row = hc[ri],
					laidCol = null,
					row2, cells = [],
					lastRow = ri == hcLen - 1,
					ci = 0,
					lenj = row.length;
				for (; ci < lenj; ci++) {
					if (lastRow && skipCI[ci]) {
						skipped++;
						continue
					}
					var col = row[ci],
						di = col.dataIndx,
						colspan = col.o_colspan,
						rowspan = col.rowSpan,
						repeat = laidCol == col ? repeat + 1 : 0,
						colUpper = ri > 0 ? hc[ri - 1][ci - skipped] : null;
					if (colUpper && (col == colUpper || di && di == colUpper.dataIndx)) {
						cells.push({
							text: "",
							empty: true
						})
					} else if (repeat) {
						cells.push({
							text: "",
							empty: true
						})
					} else {
						title = self.getTitle(col, ci);
						laidCol = col;
						cell = {
							text: title,
							alignment: col.halign || col.align,
							valign: col.hvalign,
							style: "header"
						};
						if (!lastRow) {
							cell.rowSpan = rowspan;
							cell.colSpan = colspan
						}
						if (tmp = pq.styleStr(col.styleHead)) cell.css = tmp;
						eachCell && eachCell.call(that, cell, ci, ri, col);
						cells.push(cell)
					}
				}
				row2 = {
					cells: cells
				};
				eachRow && eachRow.call(that, row2, ri);
				header.push(row2)
			}
			return header
		},
		getVars: function() {
			var that = this.that,
				o = that.options;
			return {
				remotePage: o.pageModel.type == "remote",
				offset: that.riOffset,
				iGV: that.iRenderB
			}
		},
		getBody: function(obj, data) {
			var self = this,
				that = self.that,
				rowInit = that.options.rowInit,
				dataLen = data.length,
				vars = self.getVars(),
				linkStyle = obj.linkStyle,
				remotePage = vars.remotePage,
				offset = vars.offset,
				iMerge = that.iMerge,
				CM = that.colModel,
				skipCI = self.skipCI,
				skipRI = self.skipRI,
				CMLen = CM.length,
				iGV = vars.iGV,
				render = obj.render,
				rows = [],
				row, cells, i, ci, rowprop, cellprop, cellpropdi, cell, tmp, column, objN, objM, arr, css, rowcss, eachCell = obj.eachCell,
				eachRow = obj.eachRow,
				objR, rowData, ri, rip, cellstyle, cellData, dataIndx, rowspan, colspan;
			for (i = 0; i < dataLen; i++) {
				if (skipRI[i]) {
					continue
				}
				rowData = data[i];
				rowprop = rowData.pq_rowprop || {};
				cellprop = rowData.pq_cellprop || {};
				cellstyle = rowData.pq_cellstyle || {};
				cells = [];
				ri = remotePage ? i + offset : i;
				rip = ri - offset;
				objR = {
					rowIndx: ri,
					rowIndxPage: rip,
					rowData: rowData,
					Export: true
				};
				rowcss = [pq.styleStr(rowData.pq_rowstyle)];
				if (rowInit && (tmp = (rowInit.call(that, objR) || {}).style)) {
					rowcss.push(pq.styleStr(tmp))
				}
				rowcss = rowcss.join("");
				for (ci = 0; ci < CMLen; ci++) {
					if (skipCI[ci]) continue;
					column = CM[ci];
					dataIndx = column.dataIndx;
					objN = objM = "";
					cellpropdi = cellprop[dataIndx] || {};
					rowspan = colspan = "";
					css = [pq.styleStr(column.style)];
					css.push(rowcss);
					css.push(pq.styleStr(cellstyle[dataIndx]));
					if (objM = iMerge.ismergedCell(ri, ci)) {
						if (objM = iMerge.isRootCell(ri, ci)) {
							objN = iMerge.getRootCellO(ri, ci);
							objN.Export = true;
							colspan = objM.colspan;
							rowspan = objM.rowspan;
							arr = self.getRenderVal(objN, render, iGV)
						} else {
							cells.push({
								text: "",
								empty: true
							});
							continue
						}
					} else {
						objR.colIndx = ci;
						objR.column = column;
						objR.dataIndx = dataIndx;
						arr = self.getRenderVal(objR, render, iGV)
					}
					cellData = arr[0];
					css.push(pq.styleStr(arr[1]));
					cellData = cellData == null ? "" : cellData;
					cell = {
						text: cellData,
						style: "body",
						alignment: cellpropdi.align || rowprop.align || column.align,
						valign: cellpropdi.valign || rowprop.valign || column.valign,
						rowSpan: rowspan,
						colSpan: colspan
					};
					if (tmp = self.getLink(cellpropdi, cellData)) {
						cell.text = tmp[0];
						cell.link = tmp[1];
						cell.html = tmp[2];
						linkStyle && css.unshift(linkStyle)
					}
					cell.css = css.join("");
					eachCell && eachCell.call(that, cell, ci, ri, column, rowData);
					cells.push(cell)
				}
				row = {
					cells: cells
				};
				eachRow && eachRow.call(that, row, ri, rowData, rows);
				rows.push(row)
			}
			return rows
		},
		getJsonContent: function(obj, data) {
			function replacer(key, val) {
				if ((key + "").indexOf("pq_") === 0) {
					return undefined
				}
				return val
			}
			return obj.nostringify ? data : JSON.stringify(data, obj.nopqdata ? replacer : null, obj.nopretty ? null : 2)
		},
		getMC: function(data, curPage, shiftDown) {
			var self = this,
				that = self.that,
				skipCI = self.skipCI,
				skipRI = self.skipRI,
				mcBody = that.iMerge.getMergeCells(curPage, data.length),
				shiftC = [],
				shiftsC = 0,
				shiftR = [],
				shiftsR = 0;
			if (mcBody.length) {
				if (skipCI.length) {
					that.colModel.forEach(function(col, ci) {
						if (skipCI[ci]) shiftsC++;
						shiftC[ci] = shiftsC
					})
				}
				if (skipRI.length) {
					data.forEach(function(rd, ri) {
						if (skipRI[ri]) shiftsR++;
						shiftR[ri] = shiftsR
					})
				}
			}
			return mcBody.reduce(function(arr, obj) {
				var c1 = obj.c1,
					c2 = obj.c2,
					r1 = obj.r1,
					r2 = obj.r2;
				c1 = c1 - (shiftC[c1] || 0) + (skipCI[c1] ? 1 : 0);
				r1 = r1 - (shiftR[r1] || 0) + (skipRI[r1] ? 1 : 0);
				c2 -= shiftC[c2] || 0;
				r2 -= shiftR[r2] || 0;
				if (c2 > c1 && r2 >= r1 || c2 >= c1 && r2 > r1) {
					arr.push({
						r1: r1 + shiftDown,
						r2: r2 + shiftDown,
						c1: c1,
						c2: c2
					})
				}
				return arr
			}, [])
		},
		getXlsMergeCells: function(mc, mcBody) {
			var mcs = [],
				toLetter = pq.toLetter,
				mc = mc.concat(mcBody),
				mcLen = mc.length,
				i = 0,
				obj;
			for (; i < mcLen; i++) {
				obj = mc[i];
				obj = toLetter(obj.c1) + (obj.r1 + 1) + ":" + toLetter(obj.c2) + (obj.r2 + 1);
				mcs.push(obj)
			}
			return mcs
		},
		getXlsCols: function(obj, CM) {
			var CMLen = CM.length,
				that = this.that,
				skipCI = this.skipCI,
				eachCol = obj.eachCol,
				skipped = 0,
				cols = [],
				col, column, width, i = 0,
				colWidthDefault = pq.excel.colWidth;
			for (; i < CMLen; i++) {
				if (skipCI[i]) {
					skipped++;
					continue
				}
				column = CM[i];
				width = (column._width || colWidthDefault).toFixed(2) * 1;
				col = {};
				this.copyStyle(col, column.style, column);
				width !== colWidthDefault && (col.width = width);
				column.hidden && (col.hidden = true);
				if (!pq.isEmpty(col)) {
					if (cols.length !== i - skipped) col.indx = i - skipped;
					eachCol && eachCol.call(that, col, i, column);
					cols.push(col)
				}
			}
			return cols
		},
		getXlsHeader: function(obj, hc, hcLen, mc) {
			var self = this,
				that = self.that,
				eachCell = obj.eachCellHead,
				skipCI = self.skipCI,
				hc = self.hcForHead,
				hcLen = hc.length,
				skipped = 0,
				ciLaid, eachRow = obj.eachRowHead,
				tmp, rows = [],
				i = 0;
			for (; i < hcLen; i++) {
				var row = hc[i],
					cells = [],
					lastRow = i == hcLen - 1,
					ci = 0,
					lenj = row.length;
				for (; ci < lenj; ci++) {
					if (lastRow && skipCI[ci]) {
						skipped++;
						continue
					}
					var col = row[ci],
						cell, di = col.dataIndx,
						colspan = col.o_colspan,
						rowspan = col.rowSpan,
						title = self.getTitle(col, ci),
						colUpper = i > 0 ? hc[i - 1][ci - skipped] : null;
					if (colUpper && (col == colUpper || di && di == colUpper.dataIndx)) {
						title = ""
					} else if (ci > 0 && col == hc[i][ci - 1]) {
						if (ci >= ciLaid + colspan) {
							continue
						}
						title = ""
					} else if (!lastRow && (colspan > 1 || rowspan > 1)) {
						ciLaid = ci;
						mc.push({
							r1: i,
							c1: ci,
							r2: i + rowspan - 1,
							c2: ci + colspan - 1
						})
					}
					cell = {
						value: title,
						align: col.halign || col.align,
						valign: col.hvalign
					};
					if (tmp = col.styleHead) self.copyStyle(cell, tmp);
					eachCell && eachCell.call(that, cell, ci, i, col);
					cells.push(cell)
				}
				row = {
					cells: cells
				};
				eachRow && eachRow.call(that, row, i);
				rows.push(row)
			}
			return rows
		},
		getXlsBody: function(obj, data, shiftR) {
			var self = this,
				that = self.that,
				skipRI = self.skipRI || [],
				skipCI = self.skipCI || [],
				linkStyle = obj.linkStyle,
				CMR = that.colModel,
				CMLen = CMR.length,
				eachCell = obj.eachCell,
				eachRow = obj.eachRow,
				o = that.options,
				rowInit = o.rowInit,
				mergeCell, i, j, cv, f, value, column, objR, arr, dstyle, dtitle, dprop, rows = [],
				cells, rowData, ri, rip, di, colStyle, colProp, rowprop, row, cell, cellattr, cellattrdi, tmp, cellprop, cellpropdi, cellstyle, cellstyledi, shiftRC = _pq.cFormulas.shiftRC(that),
				dataLen = data.length,
				vars = self.getVars(),
				remotePage = vars.remotePage,
				offset = vars.offset,
				iGV = vars.iGV,
				iMerge = that.iMerge,
				render = obj.render,
				objN, skippedRows = 0,
				skippedCols, indx, format, linkStyleObj = linkStyle ? pq.styleObj(linkStyle) : null;
			for (i = 0; i < dataLen; i++) {
				if (skipRI[i]) {
					skippedRows++;
					continue
				}
				rowData = data[i];
				cellattr = rowData.pq_cellattr;
				cellprop = rowData.pq_cellprop || {};
				rowprop = rowData.pq_rowprop || {};
				cellstyle = rowData.pq_cellstyle || {};
				cells = [];
				ri = remotePage ? i + offset : i;
				rip = ri - offset;
				skippedCols = 0;
				objR = {
					rowIndx: ri,
					rowIndxPage: rip,
					rowData: rowData,
					Export: true
				};
				for (j = 0; j < CMLen; j++) {
					if (skipCI[j]) {
						skippedCols++;
						continue
					}
					column = CMR[j];
					colStyle = column.style;
					colProp = column;
					di = column.dataIndx;
					cellstyledi = cellstyle[di] || "";
					cellpropdi = cellprop[di] || {};
					value = rowData[di];
					cv = value;
					f = that.getFormula(rowData, di);
					mergeCell = false;
					if (iMerge.ismergedCell(ri, j)) {
						if (iMerge.isRootCell(ri, j)) {
							objN = iMerge.getRootCellO(ri, j);
							objN.Export = true;
							arr = self.getRenderVal(objN, render, iGV);
							cv = arr[0];
							dstyle = arr[1];
							dprop = arr[2];
							dtitle = arr[3];
							mergeCell = true
						}
					}
					if (!mergeCell && !f) {
						objR.colIndx = j;
						objR.column = column;
						objR.dataIndx = di;
						arr = self.getRenderVal(objR, render, iGV);
						cv = arr[0];
						dstyle = arr[1];
						dprop = arr[2];
						dtitle = arr[3]
					}
					format = o.format.call(that, rowData, column, cellpropdi, rowprop);
					cell = {};
					if (pq.isStr(format)) {
						if (cv !== value && pq.formatNumber(value, format) === cv) {
							cv = value
						}
						cell.format = format
					}
					cv !== undefined && (cell.value = cv);
					if (cellattr && (cellattrdi = cellattr[di])) {
						if (tmp = cellattrdi.title) cell.comment = tmp;
						if (tmp = cellattrdi.style) self.copyStyle(cell, tmp)
					}
					if (tmp = self.getLink(cellpropdi, cv)) {
						cell.value = tmp[0];
						cell.link = tmp[1];
						linkStyleObj && (cellstyledi = Object.assign({}, linkStyleObj, pq.styleObj(cellstyledi)))
					}
					self.copyStyle(cell, cellstyledi, cellpropdi, colStyle, colProp);
					self.copyStyle(cell, dstyle, dprop, colStyle, colProp);
					if (dtitle) cell.comment = dtitle;
					if (f) {
						if (shiftR) {
							f = shiftRC(f, 0, shiftR)
						}
						cell.formula = f
					}
					if (!pq.isEmpty(cell)) {
						cell.dataIndx = di;
						if (cells.length !== j - skippedCols) cell.indx = j - skippedCols;
						cells.push(cell);
						eachCell && eachCell.call(that, cell, j, ri, column, rowData)
					}
				}
				row = {};
				cells.length && (row.cells = cells);
				rowData.pq_hidden && (row.hidden = true);
				rowData.pq_htfix && (row.htFix = rowData.pq_ht);
				self.copyStyle(row, rowData.pq_rowstyle, rowprop);
				if (rowInit) {
					tmp = (rowInit.call(that, objR) || {}).style;
					if (tmp) {
						self.copyStyle(row, tmp)
					}
				}
				if (!pq.isEmpty(row)) {
					indx = i + shiftR - skippedRows;
					if (rows.length !== indx) {
						row.indx = indx
					}
					eachRow && eachRow.call(that, row, ri, rowData, rows);
					rows.push(row)
				}
			}
			return rows
		},
		getLink: function(cellpropdi, cv) {
			var match;
			if (cv && pq.isStr(cv) && (match = pq.isLink(cv))) {
				return [match[3], match[1] || match[2], cv]
			}
			if (match = (cellpropdi || {}).link) {
				return [cv, match]
			}
		},
		getWorksheet: function(obj, data, CM, header, hc) {
			var self = this,
				cols = self.getXlsCols(obj, CM),
				mcHead = [],
				tmp, that = self.that,
				o = that.options,
				fc = o.freezeCols,
				hcLen = hc.length,
				shiftR = header ? hcLen : 0,
				fr = shiftR + (o.freezeRows || 0),
				_header = header ? self.getXlsHeader(obj, hc, hcLen, mcHead) : [],
				mcBody = self.getMC(data, self.curPage, shiftR),
				mergeCells = self.getXlsMergeCells(mcHead, mcBody),
				body = self.getXlsBody(obj, data, shiftR),
				sheet = {
					columns: cols,
					rows: _header.concat(body)
				};
			if (o.rtl) sheet.rtl = true;
			mergeCells.length && (sheet.mergeCells = mergeCells);
			sheet.headerRows = _header.length;
			fr && (sheet.frozenRows = fr);
			fc && (sheet.frozenCols = fc);
			sheet.pics = that.iPic.pics;
			sheet.charts = that.Charts().fcharts;
			return sheet
		}
	}, pq.mixin.render)
})(jQuery);
(function($) {
	var pqEx = pq.excel = {
		_tmpl: {
			rels: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
		},
		eachRow: function(sheetData, fn) {
			var rows = sheetData.rows,
				i = 0,
				len = rows.length;
			for (; i < len; i++) {
				fn(rows[i], i)
			}
		},
		exportWb(obj) {
			var workbook = obj.workbook,
				replace = obj.replace,
				self = this,
				templates = self._tmpl,
				totalCharts = 0,
				sheets = workbook.sheets,
				no = sheets.length,
				commentArr = [],
				drawArr = [],
				zip = new JSZip,
				mediaType = {},
				xl = zip.folder("xl");
			zip.file("_rels/.rels", templates.rels);
			zip.file("xl/_rels/workbook.xml.rels", self.getWBookRels(no));
			self.chartFileIndx = 1;
			for (var i = 0; i < sheets.length; i++) {
				var sheet = sheets[i],
					$cols = self.getCols(sheet.columns),
					comments, pics = sheet.pics || [],
					charts = sheet.charts || [],
					chartsLen = charts.length,
					hasComments, hasImage = pics.length,
					hasLinks, hasImageOrChart = hasImage || chartsLen,
					ii = i + 1,
					$frozen = self.getFrozen(sheet.frozenRows, sheet.frozenCols, sheet.rtl),
					$body = self.getBody(sheet.rows || [], sheet.columns || []),
					$merge = self.getMergeCells(sheet.mergeCells);
				if (replace) $body = $body.replace.apply($body, replace);
				comments = self.comments;
				hasComments = !pq.isEmpty(comments);
				hasLinks = !pq.isEmpty(self.links);
				xl.file("worksheets/sheet" + ii + ".xml", self.getSheet($frozen, $cols, $body, $merge, hasComments, hasImageOrChart, ii));
				if (hasComments) {
					commentArr.push(ii);
					xl.file("comments" + ii + ".xml", self.getComment());
					xl.file("drawings/vmlDrawing" + ii + ".vml", self.getVml())
				}
				if (hasImageOrChart) {
					for (var k = 0; k < chartsLen; k++) {
						var Chart = charts[k],
							[canvas, width, height] = Chart.getCanvas(),
							pic = Chart.options;
						pic.name = "testchart" + pic.id + ".png";
						pic.cx = width;
						pic.cy = height;
						pic.to = null;
						pic.src = canvas.toDataURL();
						pics.push(pic)
					}
					chartsLen = 0;
					charts = [];
					self.addPics(xl, pics, ii);
					pics.forEach(function(pic) {
						mediaType[pic.name.split(["."])[1]] = 1
					});
					drawArr.push(ii);
					totalCharts += chartsLen
				}
				if (hasComments || hasImageOrChart || hasLinks) {
					xl.file("worksheets/_rels/sheet" + ii + ".xml.rels", self.getSheetRel(ii, hasComments, hasImageOrChart))
				}
			}
			zip.file("[Content_Types].xml", self.getContentTypes(no, commentArr, drawArr, totalCharts, mediaType));
			xl.file("workbook.xml", self.getWBook(sheets, workbook.activeId));
			xl.file("styles.xml", self.getStyle());
			return zip.generate({
				type: obj.type || "blob",
				compression: "DEFLATE"
			})
		},
		addPics: function(xl, pics, ii) {
			if (pics.length) {
				var draw = ['<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:x3Unk="http://schemas.microsoft.com/office/drawing/2010/slicer" xmlns:sle15="http://schemas.microsoft.com/office/drawing/2012/slicer">'],
					drel = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'],
					id = 1,
					p = parseInt,
					factor = 9500,
					str = function(arr) {
						return ["<xdr:col>", arr[0], "</xdr:col><xdr:colOff>", p(arr[1] * factor), "</xdr:colOff><xdr:row>", arr[2], "</xdr:row><xdr:rowOff>", p(arr[3] * factor), "</xdr:rowOff>"].join("")
					};
				pics.forEach(function(pic, i) {
					var from = pic.from,
						oname = pic.name,
						rId = "rId" + id++,
						to = pic.to,
						two = to && !!to.length,
						anchor = two ? "two" : "one",
						cx = p(pic.cx * factor),
						cy = p(pic.cy * factor);
					draw.push("<xdr:", anchor, "CellAnchor>", "<xdr:from>", str(from), "</xdr:from>", two ? "<xdr:to>" + str(to) + "</xdr:to>" : '<xdr:ext cx="' + cx + '" cy="' + cy + '"/>', '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="', pic.id, '" name="Picture ', i + 1, '" descr="', oname, '"/>', '<xdr:cNvPicPr preferRelativeResize="0"/></xdr:nvPicPr>', '<xdr:blipFill><a:blip cstate="print" r:embed="', rId, '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>', '<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></xdr:spPr>', '</xdr:pic><xdr:clientData fLocksWithSheet="0"/></xdr:', anchor, "CellAnchor>");
					drel.push('<Relationship Id="', rId, '" Target="../media/', oname, '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" />');
					xl.file("media/" + oname, pic.src.split(",")[1], {
						base64: true
					})
				});
				draw.push("</xdr:wsDr>");
				drel.push("</Relationships>");
				xl.file("drawings/drawing" + ii + ".xml", draw.join(""));
				xl.file("drawings/_rels/drawing" + ii + ".xml.rels", drel.join(""))
			}
		},
		eachCell: function(coll, fn, _i) {
			coll.forEach(function(item, i) {
				var items, cell;
				if (items = item.cells) {
					i = item.indx || i;
					for (var j = 0, len = items.length; j < len; j++) {
						cell = items[j];
						fn(cell, cell.indx || j, i, _i)
					}
				} else if (items = item.rows) {
					this.eachCell(items, fn, i)
				}
			}, this)
		},
		findIndex: function(items, fn) {
			var indx = items.findIndex(fn),
				item = items[indx];
			return item.indx || indx
		},
		getArray: function(sheetData) {
			var str = [],
				self = this;
			this.eachRow(sheetData, function(row) {
				var rowstr = [];
				row.cells.forEach(function(cell) {
					rowstr.push(self.getCell(cell))
				});
				str.push(rowstr)
			});
			return str
		},
		getBody: function(rows, columns) {
			var self = this,
				colObj = {},
				formulas = pq.formulas,
				body = [],
				noTextFormat, comments = self.comments = {},
				tmp, links = self.links = {},
				i, j, riPrev, ri, ci, r, t, s, v, f, cell, cells, value, row, rowsLen = rows.length,
				cellsLen, hidden, customHt, column, style, format;
			(columns || []).forEach(function(col, i) {
				colObj[col.indx || i] = col
			});
			for (i = 0; i < rowsLen; i++) {
				row = rows[i];
				cells = row.cells || [];
				cellsLen = cells.length;
				hidden = row.hidden ? 'hidden="1" ' : "";
				customHt = row.htFix ? 'customHeight="1" ht="' + row.htFix / 1.5 + '" ' : "";
				riPrev = ri;
				ri = (row.indx || i) + 1;
				if (i > 0) {
					ri = Math.max(ri, riPrev + 1)
				}
				r = 'r="' + ri + '"';
				s = self.getStyleIndx(row);
				s = s ? ' s="' + s + '" customFormat="1"' : "";
				body.push("<row " + hidden + customHt + r + s + ">");
				for (j = 0; j < cellsLen; j++) {
					cell = cells[j];
					value = cell.value;
					ci = cell.indx || j;
					t = "";
					s = "";
					column = colObj[ci] || {};
					r = ci === j ? "" : 'r="' + pq.toLetter(ci) + ri + '"';
					style = $.extend({}, column, row, cell);
					format = cell.format;
					noTextFormat = format != "@";
					f = cell.formula;
					f = f ? "<f>" + pq.escapeXml(f) + "</f>" : "";
					if (value == null) {
						v = "<v></v>"
					} else if (noTextFormat && typeof value == "boolean") {
						v = "<v>" + (value ? "1" : "0") + "</v>";
						t = 't="b"'
					} else if (noTextFormat && value == value * 1 && (value + "").length == (value * 1 + "").length) {
						v = "<v>" + value + "</v>"
					} else if (noTextFormat && format && formulas.isDateTime(value)) {
						v = "<v>" + formulas.VALUE(value) + "</v>"
					} else {
						t = 't="inlineStr"';
						v = "<is><t>" + pq.escapeXml(value) + "</t></is>"
					}
					s = self.getStyleIndx(style);
					s = s ? 's="' + s + '"' : "";
					if (tmp = cell.comment) comments[pq.toLetter(ci) + ri] = tmp;
					if (tmp = cell.link) links[pq.toLetter(ci) + ri] = tmp;
					body.push("<c " + t + " " + r + " " + s + ">" + f + v + "</c>")
				}
				body.push("</row>")
			}
			return body.join("")
		},
		getCell: function(cell) {
			var f = cell.format,
				v = cell.value;
			return f ? pq.formulas.TEXT(v, f) : v
		},
		getCSV: function(sheetData) {
			var str = [],
				self = this;
			this.eachRow(sheetData, function(row) {
				var rowstr = [];
				row.cells.forEach(function(cell) {
					rowstr.push(self.getCell(cell))
				});
				str.push(rowstr.join(","))
			});
			return str.join("\r\n")
		},
		getColor: function() {
			var colors = {},
				padd = function(val) {
					return val.length === 1 ? "0" + val : val
				};
			return function(color) {
				var m, a, c = colors[color];
				if (!c) {
					if (/^#[0-9,a,b,c,d,e,f]{6}$/i.test(color)) {
						a = color.replace("#", "")
					} else if (m = color.match(/^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i)) {
						a = padd((m[1] * 1).toString(16)) + padd((m[2] * 1).toString(16)) + padd((m[3] * 1).toString(16))
					}
					if (a && a.length === 6) {
						c = colors[color] = "ff" + a
					}
				}
				if (c) return c;
				else throw "invalid color: " + color
			}
		}(),
		_getCol: function(cols, min, max, hidden, width, style) {
			style = style ? ' style="' + style + '"' : "";
			if (!hidden || width) {
				width = width || this.colWidth;
				width = (width / this.colRatio).toFixed(2) * 1;
				width = ' customWidth="1" width="' + width + '"'
			}
			cols.push('<col min="', min, '" max="', max, '" hidden="', hidden, '"', width, style, "/>")
		},
		getCols: function(CM) {
			if (!CM || !CM.length) {
				return ""
			}
			var cols = [],
				min, max, oldWidth, oldHidden, oldStyle, col = 0,
				oldCol = 0,
				non_first, i = 0,
				len = CM.length;
			cols.push("<cols>");
			for (; i < len; i++) {
				var c = CM[i],
					hidden = c.hidden ? 1 : 0,
					width = c.width,
					style = this.getStyleIndx(c),
					indx = c.indx;
				col = (indx || col) + 1;
				if (oldWidth === width && oldHidden === hidden && style == oldStyle && col == oldCol + 1) {
					max = col
				} else {
					if (non_first) {
						this._getCol(cols, min, max, oldHidden, oldWidth, oldStyle);
						min = null
					}
					max = col;
					min == null && (min = col)
				}
				oldWidth = width;
				oldHidden = hidden;
				oldStyle = style;
				oldCol = col;
				non_first = true
			}
			this._getCol(cols, min, max, oldHidden, oldWidth, oldStyle);
			cols.push("</cols>");
			return cols.join("")
		},
		getComment: function() {
			var comment = [],
				c = this.comments,
				key;
			for (key in c) {
				comment.push('<comment authorId="0" ref="', key, '"><text><t xml:space="preserve">', pq.escapeXml(c[key]), "</t></text></comment>")
			}
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<comments xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">', "<authors><author></author></authors>", "<commentList>", comment.join(""), "</commentList></comments>"].join("")
		},
		getContentTypes: function(no, commentArr, drawArr, totalCharts, mediaType) {
			var sheets = [],
				i = 1,
				comment = [],
				key, drw = [];
			for (; i <= no; i++) {
				sheets.push('<Override PartName="/xl/worksheets/sheet' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
			}
			commentArr.forEach(function(i) {
				comment.push('<Override PartName="/xl/comments', i, '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml" />')
			});
			for (key in mediaType) {
				drw.push('<Default Extension="' + key + '" ContentType="image/' + key + '" />')
			}
			drawArr.forEach(function(i) {
				drw.push('<Override PartName="/xl/drawings/drawing', i, '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>')
			});
			for (i = 1; i <= totalCharts; i++) {
				drw.push('<Override PartName="/xl/charts/chart', i, '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml" />')
			}
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">', '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>', '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>', '<Default Extension="xml" ContentType="application/xml" />', '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>', sheets.join(""), '<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing" />', comment.join(""), drw.join(""), "</Types>"].join("")
		},
		getFillIndx: function(bgColor) {
			var self = this,
				fs = self.fills = self.fills || {
					length: 2
				};
			return self.getIndx(fs, bgColor)
		},
		getBorderIndx: function(border) {
			var self = this,
				fs = self.borders = self.borders || {
					length: 1
				};
			return self.getIndx(fs, JSON.stringify(border))
		},
		getFontIndx: function(color, font, fontSize, bold, italic, uline) {
			var self = this,
				fs = self.fonts = self.fonts || {
					length: 1
				};
			return self.getIndx(fs, (color || "") + "_" + (font || "") + "_" + (fontSize || "") + "_" + (bold || "") + "_" + (italic || "") + "_" + (uline || ""))
		},
		getFormatIndx: function(format) {
			var self = this,
				fs = self.formats = self.formats || {
					length: 164
				};
			return self.numFmtIds[format] || self.getIndx(fs, format)
		},
		getFrozen: function(r, c, rtl) {
			r = r || 0;
			c = c || 0;
			var topLeftCell = pq.toLetter(c) + (r + 1);
			return ["<sheetViews><sheetView ", rtl ? 'rightToLeft="1"' : "", ' workbookViewId="0">', '<pane xSplit="', c, '" ySplit="', r, '" topLeftCell="', topLeftCell, '" activePane="bottomLeft" state="frozen"/>', "</sheetView></sheetViews>"].join("")
		},
		getIndx: function(fs, val) {
			var indx = fs[val];
			if (indx == null) {
				indx = fs[val] = fs.length;
				fs.length++
			}
			return indx
		},
		getItem: function(items, indx) {
			var item = items[indx],
				i1 = 0,
				i2, i, iter = 0,
				iindx = item ? item.indx : -1;
			if (iindx == null || indx == iindx) {
				return item
			}
			i2 = iindx == -1 ? items.length - 1 : indx;
			if (i2 >= 0) {
				while (true) {
					iter++;
					if (iter > 20) {
						throw "not found"
					}
					i = Math.floor((i2 + i1) / 2);
					item = items[i];
					iindx = item.indx;
					if (iindx == indx) {
						return item
					} else if (iindx > indx) {
						i2 = i
					} else {
						i1 = i == i1 ? i + 1 : i
					}
					if (i1 == i2 && i == i1) {
						break
					}
				}
			}
		},
		getMergeCells: function(mc) {
			mc = mc || [];
			var mcs = [],
				i = 0,
				mcLen = mc.length;
			mcs.push('<mergeCells count="' + mcLen + '">');
			for (; i < mcLen; i++) {
				mcs.push('<mergeCell ref="', mc[i], '"/>')
			}
			mcs.push("</mergeCells>");
			return mcLen ? mcs.join("") : ""
		},
		getSheetRel: function(i, comment, hasImageOrChart) {
			var arr = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'],
				type = 'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
			if (comment) {
				arr.push(`<Relationship Id="com${i}" Target="../comments${i}.xml" ${type}comments" />
                    <Relationship Id="vml${i}" Target="../drawings/vmlDrawing${i}.vml" ${type}vmlDrawing" />`)
			}
			if (hasImageOrChart) {
				arr.push(`<Relationship Id="rId${i}" Target="../drawings/drawing${i}.xml" ${type}drawing"/>`)
			}
			var links = this.links,
				count = 0;
			for (var ref in links) {
				count++;
				arr.push(`<Relationship Id="hid${count}" ${type}hyperlink" Target="${links[ref]}" TargetMode="External"/>`)
			}
			arr.push("</Relationships>");
			return arr.join("")
		},
		getSheet: function($frozen, $cols, $body, $merge, hasComments, hasImage, indx) {
			var links = this.links,
				ref, counter = 0,
				h = "";
			if (!pq.isEmpty(links)) {
				h = "<hyperlinks>";
				for (ref in links) {
					counter++;
					h += '<hyperlink ref="' + ref + '" r:id="hid' + counter + '"/>'
				}
				h += "</hyperlinks>"
			}
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">', $frozen, $cols, "<sheetData>", $body, "</sheetData>", $merge, h, hasImage ? '<drawing r:id="rId' + indx + '" />' : "", hasComments ? '<legacyDrawing r:id="vml' + indx + '" />' : "", "</worksheet>"].join("")
		},
		getStyleIndx: function(c) {
			var format = c.format,
				bgColor = c.bgColor,
				color = c.color,
				font = c.font,
				fontSize = c.fontSize,
				align = c.align,
				valign = c.valign,
				wrap = c.wrap,
				bold = c.bold,
				italic = c.italic,
				uline = c.underline,
				border = c.border;
			if (format || bgColor || color || font || fontSize || align || valign || wrap || bold || italic || uline || border) {
				var self = this,
					formatIndx = format ? self.getFormatIndx(format) : "",
					fillIndx = bgColor ? self.getFillIndx(bgColor) : "",
					borderIndx = border ? self.getBorderIndx(border) : "",
					fontIndx = color || font || fontSize || bold || italic || uline ? self.getFontIndx(color, font, fontSize, bold, italic, uline) : "",
					val = formatIndx + "_" + fillIndx + "_" + fontIndx + "_" + (align || "") + "_" + (valign || "") + "_" + (wrap || "") + "_" + borderIndx,
					fs = self.styles = self.styles || {
						length: 1
					};
				return self.getIndx(fs, val)
			}
		},
		getStyle: function() {
			var self = this,
				formats = self.formats,
				color, fontSize, _font, fills = self.fills,
				fonts = self.fonts,
				borders = self.borders,
				borderArr = ["left", "right", "top", "bottom"],
				bold, italic, uline, arr, formatIndx, fillIndx, fontIndx, align, valign, wrap, borderIndx, styles = self.styles,
				applyFill, applyFormat, applyFont, applyAlign, applyBorder, f1 = [],
				fill = [],
				font = [],
				border = [],
				xf = ['<xf numFmtId="0" applyNumberFormat="1"/>'],
				bstyles = {
					"1px solid": "thin",
					"2px solid": "medium",
					"3px solid": "thick",
					"3px double": "double",
					"1px dotted": "dotted",
					"1px dashed": "dashed"
				},
				f;
			if (formats) {
				delete formats.length;
				for (f in formats) {
					var f2 = pq.escapeXmlAttr(f);
					f1.push('<numFmt numFmtId="' + formats[f] + '" formatCode="' + f2 + '"/>')
				}
				delete self.formats
			}
			if (fills) {
				delete fills.length;
				for (f in fills) {
					fill.push('<fill><patternFill patternType="solid"><fgColor rgb="' + this.getColor(f) + '"/></patternFill></fill>')
				}
				delete self.fills
			}
			if (fonts) {
				delete fonts.length;
				for (f in fonts) {
					arr = f.split("_");
					color = arr[0] ? '<color rgb="' + this.getColor(arr[0]) + '" />' : "";
					_font = arr[1] ? '<name val="' + pq.escapeXmlAttr(arr[1]) + '"/>' : "";
					fontSize = arr[2] ? '<sz val="' + arr[2] + '"/>' : "";
					bold = arr[3] ? "<b/>" : "";
					italic = arr[4] ? "<i/>" : "";
					uline = arr[5] ? "<u/>" : "";
					font.push("<font>", bold, italic, uline, fontSize, color, _font, '<family val="2"/></font>')
				}
				delete self.fonts
			}
			if (borders) {
				delete borders.length;
				for (f in borders) {
					var obj = JSON.parse(f);
					border.push("<border>");
					borderArr.forEach(function(l) {
						if (obj[l]) {
							arr = obj[l].split(" ");
							border.push("<" + l + ' style="' + bstyles[[arr[0], arr[1]].join(" ")] + '"><color rgb="' + self.getColor(arr[2]) + '"/></' + l + ">")
						}
					});
					border.push("</border>")
				}
				delete self.borders
			}
			if (styles) {
				delete styles.length;
				for (f in styles) {
					arr = f.split("_");
					formatIndx = arr[0];
					fillIndx = arr[1];
					fontIndx = arr[2];
					align = arr[3];
					valign = arr[4];
					wrap = arr[5];
					borderIndx = arr[6];
					applyFill = fillIndx ? ' applyFill="1" fillId="' + fillIndx + '" ' : "";
					applyFont = fontIndx ? ' applyFont="1" fontId="' + fontIndx + '" ' : "";
					applyFormat = formatIndx ? ' applyNumberFormat="1" numFmtId="' + formatIndx + '"' : "";
					applyBorder = borderIndx ? ' applyBorder="1" borderId="' + borderIndx + '"' : "";
					align = align ? ' horizontal="' + align + '" ' : "";
					valign = valign ? ' vertical="' + valign + '" ' : "";
					wrap = wrap ? ' wrapText="1" ' : "";
					applyAlign = align || valign || wrap ? ' applyAlignment="1"><alignment ' + align + valign + wrap + "/></xf>" : "/>";
					xf.push("<xf " + applyFormat + applyFill + applyFont + applyBorder + applyAlign)
				}
				delete this.styles
			}
			f1 = f1.join("\n");
			xf = xf.join("\n");
			fill = fill.join("\n");
			font = font.join("");
			border = border.join("\n");
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">', "<numFmts>", f1, "</numFmts>", "<fonts>", '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>', font, "</fonts>", '<fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>', fill, "</fills>", "<borders><border><left/><right/><top/><bottom/><diagonal/></border>", border, "</borders>", '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>', "</cellStyleXfs>", "<cellXfs>", xf, "</cellXfs>", '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>', '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>', "</styleSheet>"].join("")
		},
		getVml: function() {
			var shapes = [],
				c = this.comments,
				key;
			for (key in c) {
				var arr = key.match(/([A-Z]+)(\d+)/),
					ci = pq.toNumber(arr[1]),
					ri = arr[2] - 1;
				shapes.push('<v:shape id="1" type="#0" style="position:absolute;margin-left:259.25pt;margin-top:1.5pt;width:108pt;height:59.25pt;z-index:1;visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto"><v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:right"></div></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>1, 15, 0, 2, 3, 31, 4, 1</x:Anchor><x:AutoFill>False</x:AutoFill>', "<x:Row>", ri, "</x:Row>", "<x:Column>", ci, "</x:Column></x:ClientData></v:shape>")
			}
			return ['<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>', '<v:shapetype id="0" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>', shapes.join(""), "</xml>"].join("")
		},
		getWBook: function(sheets, activeId) {
			var activeTab = activeId >= 0 ? "activeTab='" + activeId + "'" : "";
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">', "<bookViews><workbookView " + activeTab + " /></bookViews><sheets>", sheets.map(function(sheet, id) {
				id++;
				var name = sheet.name,
					state = sheet.hidden ? 'state="hidden"' : "";
				return ["<sheet ", state, ' name="', name ? pq.escapeXml(name) : "sheet" + id, '" sheetId="', id, '" r:id="rId', id, '"/>'].join("")
			}).join(""), "</sheets></workbook>"].join("")
		},
		getWBookRels: function(no) {
			var arr = [],
				i = 1;
			for (; i <= no; i++) {
				arr.push('<Relationship Id="rId' + i + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + i + '.xml"/>')
			}
			return ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">', arr.join(""), '<Relationship Id="rId', i, '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>', "</Relationships>"].join("")
		},
		importXl: function() {
			var o = pq.excelImport;
			return o.Import.apply(o, arguments)
		},
		SpreadSheet: function(s) {
			var ss = pqEx.SpreadSheet,
				key;
			if (this instanceof ss == false) {
				return new ss(s)
			}
			for (key in s) {
				this[key] = s[key]
			}
		}
	};
	pqEx.colRatio = 7.1;
	pqEx.colWidth = pqEx.colRatio * 8.43;
	pqEx.numFmtIds = function() {
		var fmt = pq.excelImport.preDefFormats,
			obj = {};
		for (var key in fmt) {
			obj[fmt[key]] = key
		}
		return obj
	}();
	pqEx.SpreadSheet.prototype = {
		getCell: function(ri, ci) {
			var rows = this.rows || [],
				row = pqEx.getItem(rows, ri) || {
					cells: []
				},
				cell = pqEx.getItem(row.cells, ci);
			return cell
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.formulasModel = {
		on: true
	};
	_pq.pqGrid.prototype.getFormula = function(rd, di) {
		var fnW = this.iFormulas.getFnW(rd, di);
		return fnW ? fnW.fn : undefined
	};
	pq.myObject = class extends String {
		constructor(value, address, grid) {
			super(value);
			this._value = value;
			this._address = address;
			this._grid = grid
		}
		valueOf() {
			return this._value
		}
		toString() {
			return this._value
		}
		address() {
			return this._address
		}
		grid() {
			return this._grid
		}
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance,
			f, FM = grid.options.formulasModel;
		if (FM.on) {
			f = grid.iFormulas = new cF(grid)
		}
		grid.Formulas = function() {
			return f
		}
	});
	var cF = _pq.cFormulas = function(that) {
		var self = this;
		self.that = that;
		self.fn = {};
		self.tabNames = {};
		if (!that.options.skipSSFn) that.on("dataReadyDone", self.onDataReadyDone.bind(self)).on("colMove colAdd colRemove", self.onColumnAMR.bind(self)).on("beforeValidateDone", self.onBeforeValidateDone.bind(self)).on("autofillSeries", self.onAutofill.bind(self)).on("editorBegin", self.onEditorBegin.bind(self)).on("editorEnd", self.onEditorEnd.bind(self)).on("editorKeyUp editorClick", self.onEditorKeyUp.bind(self)).on(true, "change", self.onChange.bind(self)).on("tabChange", self.onTabChange.bind(self)).on("tabRename", self.onTabRename.bind(self))
	};
	$.extend(cF, {
		deString: function(fn, cb, exec) {
			var arr = [];
			fn = fn.replace(/(?:^|[^"]+)"(([^"]|"{2})+)"(?=([^"]+|$))/g, function(a, b) {
				var indx = a.indexOf('"' + b + '"');
				arr.push(b);
				return a.slice(0, indx) + "#" + (arr.length - 1) + "#"
			});
			fn = cb(fn);
			arr.forEach(function(_str, i) {
				exec && (_str = _str.replace(/""/g, '\\"'));
				fn = fn.replace("#" + i + "#", '"' + _str + '"')
			});
			return fn
		},
		reSheet: "(?:(?:'(?:''|[^'])+'|[A-Za-z0-9_\\u0080-\\uFFFF]{1,31})!)?",
		selectExp: function(val, pos) {
			var valPos = val.slice(0, pos).replace(/"[^"]*"/g, ""),
				m1, m2, remain, exp;
			if (!/"[^"]+$/.test(valPos)) {
				remain = val.slice(pos);
				if ((m1 = valPos.match(/.*?([a-z0-9:$]+)$/i)) && (remain === "" && (m2 = []) || (m2 = remain.match(/^([a-z0-9:$]+)?.*/i)))) {
					exp = (m1[1] + (m2[1] == null ? "" : m2[1])).replace(/\$/g, "").toUpperCase();
					return exp
				}
			}
		},
		shiftRC: function(that) {
			var self = cF,
				maxRI = that ? that.get_p_data().length - 1 : 0,
				maxCI = that ? that.colModel.length - 1 : 0;
			return function(fn, diffX, diffY) {
				diffX && (fn = self.shiftC(fn, diffX, maxCI));
				diffY && (fn = self.shiftR(fn, diffY, maxRI));
				return fn
			}
		},
		getTab: function(sheet) {
			var tabName = sheet.slice(0, sheet.length - 1).replace(/''/g, "'");
			if (tabName[0] == "'") {
				tabName = tabName.slice(1, tabName.length - 1)
			}
			return tabName
		},
		shiftR: function(fn, diff, maxRI, tabs) {
			var reSheet = cF.reSheetC,
				re1 = new RegExp(reSheet + "(\\$?)([A-Z]+)(\\$?)([\\d]+(?!!))", "g"),
				re2 = new RegExp(reSheet + "(\\$?)([0-9]+):(\\$?)([0-9]+)", "g"),
				getMaxRI = function(sheet) {
					return tabs[cF.getTab(sheet)].pdata.length - 1
				};
			return cF.deString(fn, function(_fn) {
				return _fn.replace(re1, function(full, sheet, dollar1, letter, dollar2, i) {
					if (dollar2) {
						return full
					} else {
						var ri = i * 1 + diff - 1;
						maxRI = sheet ? getMaxRI(sheet) : maxRI;
						ri = ri < 0 ? 0 : maxRI && ri > maxRI ? maxRI : ri;
						return (sheet || "") + dollar1 + letter + (ri + 1)
					}
				}).replace(re2, function(full, sheet, dollar1, ri1, dollar2, ri2) {
					var ri;
					maxRI = sheet ? getMaxRI(sheet) : maxRI;
					if (!dollar1) {
						ri = ri1 * 1 + diff - 1;
						ri = ri < 0 ? 0 : maxRI && ri > maxRI ? maxRI : ri;
						ri1 = ri + 1
					}
					if (!dollar2) {
						ri = ri2 * 1 + diff - 1;
						ri = ri < 0 ? 0 : maxRI && ri > maxRI ? maxRI : ri;
						ri2 = ri + 1
					}
					return (sheet || "") + dollar1 + ri1 + ":" + dollar2 + ri2
				})
			})
		},
		shiftC: function(fn, diff, maxCI, tabs) {
			var reSheet = cF.reSheetC,
				re1 = new RegExp(reSheet + "(\\$?)([A-Z]+)(\\$?)([\\d]+)", "g"),
				re2 = new RegExp(reSheet + "(\\$?)([A-Z]+):(\\$?)([A-Z]+)", "g"),
				getMaxCI = function(sheet) {
					return tabs[cF.getTab(sheet)].colModel.length - 1
				};
			return cF.deString(fn, function(_fn) {
				_fn = _fn.replace(re1, function(full, sheet, dollar1, letter, dollar2, i) {
					if (dollar1) {
						return full
					} else {
						var ci = pq.toNumber(letter) + diff;
						maxCI = sheet ? getMaxCI(sheet) : maxCI;
						ci = ci < 0 ? 0 : maxCI && ci > maxCI ? maxCI : ci;
						return (sheet || "") + pq.toLetter(ci) + dollar2 + i
					}
				});
				return _fn.replace(re2, function(full, sheet, dollar1, letter1, dollar2, letter2) {
					var c;
					maxCI = sheet ? getMaxCI(sheet) : maxCI;
					if (!dollar1) {
						c = pq.toNumber(letter1) + diff;
						c = c < 0 ? 0 : maxCI && c > maxCI ? maxCI : c;
						letter1 = pq.toLetter(c)
					}
					if (!dollar2) {
						c = pq.toNumber(letter2) + diff;
						c = c < 0 ? 0 : maxCI && c > maxCI ? maxCI : c;
						letter2 = pq.toLetter(c)
					}
					return (sheet || "") + dollar1 + letter1 + ":" + dollar2 + letter2
				})
			})
		}
	});
	cF.reSheetC = cF.reSheet.replace("?:", "");
	cF.prototype = {
		addRowIndx: function(addList) {
			addList.forEach(function(rObj) {
				var rd = rObj.newRow,
					pq_fn = rd.pq_fn,
					fn, key;
				if (pq_fn) {
					for (key in pq_fn) {
						fn = pq_fn[key];
						fn.ri = fn.riO = rd.pq_ri
					}
				}
			})
		},
		cell: function(exp) {
			var cell = this.toCell(exp),
				r = cell.r,
				c = cell.c;
			return this.valueArr(r, c)[0]
		},
		check: function(fn) {
			return cF.deString(fn, function(fn) {
				fn = fn.replace(new RegExp("(s+)" + cF.reSheet + "(s+)", "g"), function(a) {
					return a.replace(/\s/g, "")
				});
				return fn.toUpperCase().replace(/([A-Z]+)([0-9]+)\:([A-Z]+)([0-9]+)/g, function(full, c1, r1, c2, r2) {
					c1 = pq.toNumber(c1);
					c2 = pq.toNumber(c2);
					if (c1 > c2) {
						c1 = [c2, c2 = c1][0]
					}
					if (r1 * 1 > r2 * 1) {
						r1 = [r2, r2 = r1][0]
					}
					return pq.toLetter(c1) + r1 + ":" + pq.toLetter(c2) + r2
				})
			})
		},
		computeAll: function() {
			var self = this,
				present;
			self.initObj();
			self.eachFormula(function(fnW) {
				fnW.clean = 0;
				present = true
			});
			if (present) {
				self.eachFormula(function(fnW, rd, di, ri, isMain) {
					try {
						var val = self.execIfDirty(fnW)
					} catch (ex) {
						val = pq.isStr(ex) ? ex : ex.message
					}
					rd[di] = val
				});
				return true
			}
		},
		eachFormula: function(fn) {
			var self = this,
				isMain = true,
				that = self.that,
				columns = that.columns,
				cell = function(rd, ri, pq_fn) {
					var di, fnW;
					for (di in pq_fn) {
						if (columns[di]) {
							fnW = pq_fn[di];
							if (typeof fnW != "string") {
								fn(fnW, rd, di, ri, isMain)
							}
						}
					}
				},
				row = function(data) {
					data = data || [];
					var i = data.length,
						rd, pq_fn;
					while (i--)(rd = data[i]) && (pq_fn = rd.pq_fn) && cell(rd, i, pq_fn)
				};
			row(that.get_p_data());
			isMain = false;
			row(that.options.summaryData)
		},
		execIfDirty: function(fnW, val) {
			if (!fnW.clean) {
				fnW.clean = .5;
				fnW.val = this.exec(fnW.fn, fnW.ri, fnW.ci);
				fnW.clean = 1
			} else if (fnW.clean == .5) {
				return val
			}
			return fnW.val
		},
		replace: function(a, b, rangeOrCell, valueOf) {
			var indx = b.lastIndexOf("!"),
				self = this,
				absame = a === b,
				obj = self.obj,
				first;
			if (indx > 0) {
				var iTab = self.that.iTab,
					tabs = iTab.tabs(),
					id, tab, tabName = b.substr(0, indx).toUpperCase(),
					ref = b.substr(indx + 1, b.length - 1);
				if (tabName[0] == "'") {
					tabName = tabName.slice(1, tabName.length - 1);
					tabName = tabName.replace(/''/g, "'");
					b = tabName + "!" + ref
				}
				id = tabs.findIndex(function(_tab) {
					return _tab.name.toUpperCase() == tabName
				});
				if (id >= 0) {
					tab = tabs[id];
					self.tabNames[tabName] = instance = iTab.grid(tab) || iTab.create(id);
					obj[b] = obj[b] || instance.iFormulas[rangeOrCell](ref)
				}
				b = b.replace(/'/g, "\\'")
			} else {
				obj[b] = obj[b] || self[rangeOrCell](b)
			}
			if (rangeOrCell == "range") {
				return "this['" + b + "']"
			} else {
				first = a.charAt(0);
				var val = "this['" + b + "']";
				if (valueOf) {
					val = "(" + val + ").valueOf()"
				}
				return (absame ? "" : first == "$" ? "" : first) + val
			}
		},
		exec: function(_fn, r, c) {
			var self = this,
				obj = self.obj,
				replaceOutSheet = self.replaceOutSheet,
				reSheet = cF.reSheet,
				fn = cF.deString(_fn, function(fn) {
					var re = "(?:\\(|\\,|^|\\+)((" + reSheet + "\\$?[A-Z]+\\$?[0-9]+\\+?){2,})(?:\\)|\\,|$|\\+)";
					fn = fn.replace(new RegExp(re, "g"), function(full, a) {
						var b = replaceOutSheet(a, "\\+", "?"),
							ret = "SUM(" + b.split("?").join(",") + ")",
							prefix = full[0],
							suffix = full[full.length - 1];
						prefix = prefix == a[0] ? "" : prefix;
						suffix = suffix == a[a.length - 1] ? "" : suffix;
						return prefix + ret + suffix
					});
					fn = replaceOutSheet(fn, "\\^", "**");
					fn = replaceOutSheet(fn, "\\%", "/100");
					fn = replaceOutSheet(fn, "{", "[");
					fn = replaceOutSheet(fn, "}", "]");
					fn = replaceOutSheet(fn, "(<>|=)", function(m) {
						var operator = m == "=" ? "===" : "!==";
						return operator
					});
					fn = replaceOutSheet(fn, "&", "+");
					re = "(" + reSheet + "\\$?([A-Z]+)?\\$?([0-9]+)?\\:\\$?([A-Z]+)?\\$?([0-9]+)?)";
					fn = fn.replace(new RegExp(re, "g"), function(a, b) {
						return self.replace(a, b, "range")
					});
					re = "((===|!==|[^:A-Z'$]|^)(" + reSheet + "\\$?[A-Z]+\\$?[0-9]+))(?![:\\d]+)(?=(===|!==)?)";
					fn = fn.replace(new RegExp(re, "g"), function(mF, m1, oper1, a, oper2) {
						if (a.indexOf(":") > 0) {
							return a
						}
						var isCond = _oper => ["===", "!=="].includes(_oper);
						if (isCond(oper1)) {
							var ret = self.replace(a, a, "cell", true);
							return oper1 + ret
						} else if (isCond(oper2)) {
							var ret = self.replace(m1, a, "cell", true);
							return ret
						} else {
							return self.replace(m1, a, "cell")
						}
					});
					return fn
				}, true);
			obj.getRange = function() {
				return {
					r1: r,
					c1: c
				}
			};
			try {
				var v = new Function("with(this){return " + fn + "}").call(obj);
				if (pq.isFn(v)) {
					v = "#NAME?"
				}
				if (v instanceof pq.myObject) {
					v = v.valueOf()
				}
				v !== v && (v = null)
			} catch (ex) {
				v = pq.isStr(ex) ? ex : ex.message
			}
			return v
		},
		replaceOutSheet: function(fn, a, b) {
			return fn.replace(new RegExp("'(?:[^']|'')+'|(" + a + ")", "g"), function(match, grp) {
				return match == grp ? typeof b == "function" ? b.apply(this, Array.from(arguments).slice(1)) : b : match
			})
		},
		initObj: function() {
			var self = this;
			self.obj = Object.assign({
				iFormula: self,
				locale: self.that.options.localeFmt
			}, pq.formulas)
		},
		onAutofill: function(evt, ui) {
			var sel = ui.sel,
				self = this,
				that = self.that,
				r = sel.r,
				c = sel.c,
				xDir = ui.x,
				rd = that.getRowData({
					rowIndx: r
				}),
				CM = that.colModel,
				maxCi = CM.length - 1,
				maxRi = that.get_p_data().length - 1,
				tabs = self.tabNames,
				di = CM[c].dataIndx,
				fnW = self.getFnW(rd, di);
			fnW && (ui.series = function(x) {
				return "=" + (xDir ? cF.shiftC(fnW.fn, x - 1, maxCi, tabs) : cF.shiftR(fnW.fn, x - 1, maxRi, tabs))
			})
		},
		onBeforeValidateDone: function(evt, ui) {
			var self = this,
				colIndxs = this.that.colIndxs,
				fn = function(list) {
					list.forEach(function(rObj) {
						var newRow = rObj.newRow,
							val, di, rd = rObj.rowData,
							fnW;
						for (di in newRow) {
							val = newRow[di];
							if (pq.isStr(val) && val[0] === "=") {
								ui.allowInvalid = true;
								var fn = self.check(val),
									fnWOld = rd ? self.getFnW(rd, di) : null;
								if (fnWOld) {
									if (fn !== fnWOld.fn) {
										rObj.oldRow[di] = "=" + fnWOld.fn;
										self.save(rd, di, fn, rObj.rowIndx, colIndxs[di])
									}
								} else {
									self.save(rd || newRow, di, fn, rObj.rowIndx, colIndxs[di])
								}
							} else if (rd) {
								if (fnW = self.remove(rd, di)) {
									rObj.oldRow[di] = "=" + fnW.fn
								}
							}
						}
					})
				};
			fn(ui.addList);
			fn(ui.updateList)
		},
		onTabChange: function(evt, ui) {
			if (this.tabNames[ui.tab.name.toUpperCase()] && !ui.addList.length && !ui.deleteList.length) {
				this.computeAll();
				this.that.refresh()
			}
		},
		onTabRename: function(evt, ui) {
			var tabNames = this.tabNames,
				oldName = ui.oldVal.toUpperCase(),
				val = ui.tab.name.toUpperCase(),
				tabToFn = function(_val) {
					_val = _val.replace(/'/g, "''");
					if (/[\s~!@#'\.,$%^&(\)<>]+/.test(_val)) _val = "'" + _val + "'";
					return _val + "!"
				};
			if (tabNames[oldName]) {
				delete tabNames[oldName];
				tabNames[val] = 1;
				val = tabToFn(val);
				oldName = tabToFn(oldName);
				this.eachFormula(function(fnW) {
					fnW.fn = fnW.fn.split(oldName).join(val)
				})
			}
		},
		onChange: function(evt, ui) {
			this.addRowIndx(ui.addList);
			if (!ui.addList.length && !ui.deleteList.length) {
				if (this.computeAll()) {}
			}((this.that.options.tabModel || {})._options || {}).initSSFn = true
		},
		onColumnAMR: function() {
			var self = this,
				ciNew, diff, that = self.that,
				shift = cF.shiftRC(that),
				colIndxs = that.colIndxs;
			self.eachFormula(function(fnW, rd, di) {
				ciNew = colIndxs[di];
				if (fnW.ci != ciNew) {
					diff = ciNew - fnW.ciO;
					fnW.ci = ciNew;
					fnW.fn = shift(fnW.fnOrig, diff, fnW.ri - fnW.riO)
				}
			});
			ciNew != null && self.computeAll()
		},
		onEditorBegin: function(evt, ui) {
			var fnW = this.getFnW(ui.rowData, ui.dataIndx);
			fnW && ui.$editor.val("=" + fnW.fn)
		},
		onEditorEnd: function() {
			pq.intel.hide()
		},
		onEditorKeyUp: function(evt, ui) {
			var $ed = ui.$editor,
				edtype, val = $ed.val(),
				i = pq.intel,
				pos;
			if (val && val.indexOf("=") === 0) {
				if (edtype = $ed.is("textarea") ? 1 : $ed.is("div[contenteditable") ? 2 : 0) {
					pos = edtype == 2 ? window.getSelection().getRangeAt(0).startOffset : ed.selectionEnd;
					i.popup(val, pos, $ed);
					this.select(val, pos)
				}
			}
		},
		onDataReadyDone: function() {
			var self = this,
				present, that = self.that,
				o = that.options,
				shift = cF.shiftRC(that),
				colIndxs = that.colIndxs,
				cb = function(rd, riNew, pq_fn) {
					var fnW, di, diff;
					for (di in pq_fn) {
						fnW = pq_fn[di];
						present = true;
						if (pq.isStr(fnW)) {
							self.save(rd, di, self.check(fnW), riNew, colIndxs[di])
						} else if (fnW.ri != riNew) {
							diff = riNew - fnW.riO;
							fnW.ri = riNew;
							fnW.fn = shift(fnW.fnOrig, fnW.ci - fnW.ciO, diff)
						}
					}
				},
				cb2 = function(data) {
					data = data || [];
					var i = data.length,
						rd, pq_fn;
					while (i--)(rd = data[i]) && (pq_fn = rd.pq_fn) && cb(rd, i, pq_fn)
				};
			cb2(that.get_p_data());
			cb2(o.summaryData);
			self.initObj();
			if (o.initSSFn && present) {
				self.computeAll()
			}
		},
		getFnW: function(rd, di) {
			var fn;
			if (fn = rd.pq_fn) {
				return fn[di]
			}
		},
		remove: function(rd, di) {
			var pq_fn = rd.pq_fn,
				fnW;
			if (pq_fn && (fnW = pq_fn[di])) {
				delete pq_fn[di];
				if (pq.isEmpty(pq_fn)) {
					delete rd.pq_fn
				}
				return fnW
			}
		},
		range: function(exp) {
			var arr = exp.split(":"),
				that = this.that,
				cell1 = this.toCell(arr[0]),
				r1 = cell1.r,
				c1 = cell1.c,
				cell2 = this.toCell(arr[1]),
				r2 = cell2.r,
				c2 = cell2.c;
			return this.valueArr(r1 == null ? 0 : r1, c1 == null ? 0 : c1, r2 == null ? that.get_p_data().length - 1 : r2, c2 == null ? that.colModel.length - 1 : c2)
		},
		save: function(rd, di, fn, ri, ci) {
			var fns, fn_checked = fn.replace(/^=/, ""),
				fnW = {
					clean: 0,
					fn: fn_checked,
					fnOrig: fn_checked,
					riO: ri,
					ciO: ci,
					ri: ri,
					ci: ci
				};
			fns = rd.pq_fn = rd.pq_fn || {};
			fns[di] = fnW;
			return fnW
		},
		selectRange: function(val, pos) {
			var exp = cF.selectExp(val, pos),
				arr, m1, m2, range;
			if (exp) {
				if (/^([a-z0-9]+):([a-z0-9]+)$/i.test(exp)) {
					arr = exp.split(":");
					m1 = this.toCell(arr[0]);
					m2 = this.toCell(arr[1]);
					range = {
						r1: m1.r,
						c1: m1.c,
						r2: m2.r,
						c2: m2.c
					}
				} else if (/^[a-z]+[0-9]+$/i.test(exp)) {
					m1 = this.toCell(exp);
					range = {
						r1: m1.r,
						c1: m1.c
					}
				}
				return range
			}
		},
		select: function(val, pos) {
			var range = this.selectRange(val, pos),
				that = this.that;
			range ? that.Range(range).select() : that.Selection().removeAll()
		},
		toCell: function(address) {
			var m = address.match(/\$?([A-Z]+)?\$?(\d+)?/);
			return {
				c: m[1] ? pq.toNumber(m[1]) : null,
				r: m[2] ? m[2] - 1 : null
			}
		},
		valueArr: function(r1, c1, r2, c2) {
			var that = this.that,
				CM = that.colModel,
				clen = CM.length,
				ri, ci, rd, di, fnW, val, nval, arr = [],
				arr2 = [],
				_arr2 = [],
				data = that.get_p_data(),
				dlen = data.length;
			r2 = r2 == null ? r1 : r2;
			c2 = c2 == null ? c1 : c2;
			r1 = r1 < 0 ? 0 : r1;
			c1 = c1 < 0 ? 0 : c1;
			r2 = r2 >= dlen ? dlen - 1 : r2;
			c2 = c2 >= clen ? clen - 1 : c2;
			for (ri = r1; ri <= r2; ri++) {
				rd = data[ri];
				for (ci = c1; ci <= c2; ci++) {
					di = CM[ci].dataIndx;
					if (fnW = this.getFnW(rd, di)) {
						val = this.execIfDirty(fnW, rd[di])
					} else {
						val = rd[di];
						if (val == null) val = ""
					}
					val = new pq.myObject(val, {
						ri: ri,
						ci: ci,
						di: di
					}, that);
					arr.push(val);
					_arr2.push(val)
				}
				arr2.push(_arr2);
				_arr2 = []
			}
			arr.get2Arr = function() {
				return arr2
			};
			arr.getRange = function() {
				return {
					r1: r1,
					c1: c1,
					r2: r2,
					c2: c2
				}
			};
			return arr
		}
	}
})(jQuery);
(function($) {
	pq.intel = {
		removeFn: function(text) {
			var len = text.length,
				len2;
			text = text.replace(/[a-z]*\([^()]*\)/gi, "");
			len2 = text.length;
			return len === len2 ? text : this.removeFn(text)
		},
		removeStrings: function(text) {
			text = text.replace(/"[^"]*"/g, "");
			return text.replace(/"[^"]*$/, "")
		},
		getMatch: function(text, exact) {
			var obj = pq.formulas,
				arr = [],
				fn;
			text = text.toUpperCase();
			for (fn in obj) {
				if (exact) {
					if (fn === text) {
						return [fn]
					}
				} else if (fn.indexOf(text) === 0) {
					arr.push(fn)
				}
			}
			return arr
		},
		intel: function(text) {
			text = this.removeStrings(text);
			text = this.removeFn(text);
			var re = /^=(.*[,+\-&*\s(><=])?([a-z]+)((\()[^)]*)?$/i,
				m, fn, exact;
			if (m = text.match(re)) {
				fn = m[2];
				m[4] && (exact = true)
			}
			return [fn, exact]
		},
		movepos: function(val) {
			var m;
			if (m = val.match(/([^a-z].*)/i)) {
				return val.indexOf(m[1]) + 1
			}
			return val.length
		},
		intel3: function(val, pos) {
			if (pos < val.length && /=(.*[,+\-&*\s(><=])?[a-z]+$/i.test(val.slice(0, pos))) {
				pos += this.movepos(val.slice(pos))
			}
			var valPos = val.substr(0, pos),
				fn = this.intel(valPos);
			return fn
		},
		item: function(fn) {
			var desc = this.that.options.strFormulas;
			desc = desc ? desc[fn] : null;
			return "<div>" + (desc ? desc[0] : fn) + "</div>" + (desc ? "<div style='font-size:0.9em;color:#888;margin-bottom:5px;'>" + desc[1] + "</div>" : "")
		},
		popup: function(val, pos, $editor) {
			var $grid = $editor.closest(".pq-grid"),
				$old_intel = $(".pq-intel"),
				$parent = $grid,
				fn, fns, content, arr = this.intel3(val, pos);
			this.that = $grid.pqGrid("instance");
			$old_intel.remove();
			if (fn = arr[0]) {
				fns = this.getMatch(fn, arr[1]);
				content = fns.map(this.item, this).join("");
				if (content) {
					$("<div class='pq-intel'></div>").appendTo($parent).html(content).position({
						my: "center top",
						at: "center bottom",
						collision: "flipfit",
						of: $editor
					})
				}
			}
		},
		hide: function() {
			$(".pq-intel").remove()
		}
	}
})(jQuery);
(function($) {
	var f = pq.formulas = {
		evalify: function(cond) {
			var m = (cond + "").match(/([><=]{1,2})?(.*)/),
				m1 = m[1] || "=",
				m2 = m[2],
				reg, equal = m1 !== "<>",
				ISNUMBER, self = this;
			if (/(\*|\?)/.test(m2)) {
				reg = m2.replace(/\*/g, ".*").replace(/\?/g, "\\S").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
				reg = new RegExp("^" + reg + "$", "i")
			} else {
				m1 = m1 === "=" ? "==" : m1 === "<>" ? "!=" : m1;
				ISNUMBER = this.ISNUMBER(m2);
				if (ISNUMBER) {
					m2 = m2.valueOf();
					const expression = `return this.ISNUMBER(a)? a.valueOf() ${m1} ${m2}: false;`;
					return new Function("a", expression).bind(self)
				} else {
					m2 = m2.toUpperCase()
				}
			}
			return val => {
				val = val == null ? "" : val;
				var ret = reg ? reg.test(val) : (val + "").toUpperCase() == m2;
				ret = equal ? ret : !ret;
				return ret
			}
		},
		get2Arr: function(arr) {
			return arr.get2Arr ? arr.get2Arr() : arr
		},
		ISNUMBER: function(val) {
			return parseFloat(val) == val
		},
		_reduce: function(arr, arr2) {
			var _arr = [],
				_arr2 = arr2.map(function() {
					return []
				});
			arr.forEach(function(val, indx) {
				if (val != null) {
					val = val * 1;
					if (!isNaN(val)) {
						_arr.push(val);
						_arr2.forEach(function(_a, i) {
							_a.push(arr2[i][indx])
						})
					}
				}
			});
			return [_arr, _arr2]
		},
		reduce: function(arg) {
			arg = this.toArray(arg);
			var arr = arg.shift(),
				arr2 = arg.filter(function(_arr, indx) {
					return indx % 2 == 0
				}),
				a = this._reduce(arr, arr2);
			arr = a[0];
			arr2 = a[1];
			return [arr].concat(arg.map(function(item, indx) {
				return indx % 2 == 0 ? arr2[indx / 2] : arg[indx]
			}))
		},
		strDate1: "(\\d{1,2})/(\\d{1,2})/(\\d{2,4})",
		strDate2: "(\\d{4})-(\\d{1,2})-(\\d{1,2})",
		strDate3: "(\\d{1,2})-(\\d{1,2})-(\\d{4})",
		strTime: "(\\d{1,2})(:(\\d{1,2}))?(:(\\d{1,2}))?(\\s(AM|PM))?",
		isDateTime: function(val) {
			return (this.reDateTime.test(val) || this.reDate.test(val)) && !isNaN(Date.parse(val)) || val && val.constructor == Date
		},
		toArray: function(arg) {
			var arr = [],
				i = 0,
				len = arg.length;
			for (; i < len; i++) {
				arr.push(arg[i])
			}
			return arr
		},
		serialToDate: function(val) {
			var dt = new Date(Date.UTC(1900, 0, 1)),
				valInt = parseInt(val),
				seconds = val - valInt;
			dt.setUTCDate(dt.getUTCDate() + valInt - 2);
			if (seconds) {
				seconds = Math.round(seconds * 24 * 3600);
				dt.setUTCSeconds(seconds)
			}
			return dt
		},
		varToDate: function(val) {
			var val2;
			if (this.ISNUMBER(val)) {
				val2 = this.serialToDate(val)
			} else if (val.getTime) {
				val2 = val
			} else if (pq.isStr(val)) {
				val = $.trim(val);
				var arr = pq.parseDate(val, undefined, "en-US", true);
				val2 = new Date(Date.UTC(arr[0], arr[1] - 1, arr[2], arr[3] || 0, arr[4] || 0, arr[5] || 0))
			}
			return val2
		},
		_IFS: function(arg, fn) {
			var len = arg.length,
				i = 0,
				arr = [],
				a = 0;
			for (; i < len; i = i + 2) {
				arr.push(this.evalify(arg[i + 1]))
			}
			var condsIndx = arg[0].length,
				lenArr = len / 2,
				j;
			while (condsIndx--) {
				for (j = 0; j < lenArr; j++) {
					if (!arr[j](arg[j * 2][condsIndx])) {
						break
					}
				}
				a += j === lenArr ? fn(condsIndx) : 0
			}
			return a
		},
		ABS: function(val) {
			return Math.abs(val.map ? val[0] : val)
		},
		ACOS: function(val) {
			return Math.acos(val)
		},
		ADDRESS: function(row, col, abs_num) {
			return (abs_num == 2 || abs_num == 4 ? "" : "$") + pq.toLetter(col - 1) + (abs_num == 3 || abs_num == 4 ? "" : "$") + row
		},
		AND: function() {
			var arr = this.toArray(arguments);
			return eval(arr.join(" && "))
		},
		ASIN: function(val) {
			return Math.asin(val)
		},
		ATAN: function(val) {
			return Math.atan(val)
		},
		_AVERAGE: function(arr) {
			var count = 0,
				sum = 0;
			arr.forEach(function(val) {
				if (parseFloat(val) == val) {
					sum += val * 1;
					count++
				}
			});
			if (count) {
				return sum / count
			}
			return "#VALUE!"
		},
		AVERAGE: function() {
			return this._AVERAGE(pq.flatten(arguments))
		},
		AVERAGEIF: function(range, cond, avg_range) {
			return this.AVERAGEIFS(avg_range || range, range, cond)
		},
		AVERAGEIFS: function() {
			var args = this.reduce(arguments),
				count = 0,
				avg_range = args.shift(),
				sum = this._IFS(args, function(condIndx) {
					count++;
					return avg_range[condIndx]
				});
			if (!count) {
				return "#DIV/0!"
			}
			return sum / count
		},
		TRUE: true,
		FALSE: false,
		CEILING: function(val) {
			return Math.ceil(val)
		},
		CHAR: function(val) {
			return String.fromCharCode(val)
		},
		CHOOSE: function() {
			var arr = pq.flatten(arguments),
				num = arr[0];
			if (num > 0 && num < arr.length) {
				return arr[num]
			} else {
				return "#VALUE!"
			}
		},
		CODE: function(val) {
			return (val + "").charCodeAt(0)
		},
		COLUMN: function(val) {
			return (val || this).getRange().c1 + 1
		},
		COLUMNS: function(arr) {
			var r = arr.getRange();
			return r.c2 - r.c1 + 1
		},
		CONCAT: function() {
			return this.CONCATENATE.apply(this, arguments)
		},
		CONCATENATE: function() {
			var arr = pq.flatten(arguments),
				str = "";
			arr.forEach(function(val) {
				str += val
			});
			return str
		},
		COS: function(val) {
			return Math.cos(val)
		},
		_COUNT: function(arg) {
			var arr = pq.flatten(arg),
				self = this,
				empty = 0,
				values = 0,
				numbers = 0;
			arr.forEach(function(val) {
				if (val == null || val === "") {
					empty++
				} else {
					values++;
					if (self.ISNUMBER(val)) {
						numbers++
					}
				}
			});
			return [empty, values, numbers]
		},
		COUNT: function() {
			return this._COUNT(arguments)[2]
		},
		COUNTA: function() {
			return this._COUNT(arguments)[1]
		},
		COUNTBLANK: function() {
			return this._COUNT(arguments)[0]
		},
		COUNTIF: function(range, cond) {
			return this.COUNTIFS(range, cond)
		},
		COUNTIFS: function() {
			return this._IFS(arguments, function() {
				return 1
			})
		},
		DATE: function(year, month, date) {
			if (year < 0 || year > 9999) {
				return "#NUM!"
			} else if (year <= 1899) {
				year += 1900
			}
			return this.VALUE(new Date(Date.UTC(year, month - 1, date)))
		},
		DATEVALUE: function(val) {
			if (pq.isStr(val)) {
				var arr = pq.parseDate(val, undefined, "en-US", true);
				val = arr[0] + "-" + arr[1] + "-" + arr[2]
			}
			return this.DATEDIF("1/1/1900", val, "D") + 2
		},
		DATEDIF: function(start, end, unit) {
			var to = this.varToDate(end),
				from = this.varToDate(start),
				months, endTime = to.getTime(),
				startTime = from.getTime(),
				diffDays = (endTime - startTime) / (1e3 * 60 * 60 * 24);
			if (unit === "Y") {
				return parseInt(diffDays / 365)
			} else if (unit === "M") {
				months = to.getUTCMonth() - from.getUTCMonth() + 12 * (to.getUTCFullYear() - from.getUTCFullYear());
				if (from.getUTCDate() > to.getUTCDate()) {
					months--
				}
				return months
			} else if (unit === "D") {
				return Math.round(diffDays)
			} else {
				return "#NUM!."
			}
		},
		DAY: function(val) {
			return this.varToDate(val).getUTCDate()
		},
		DAYS: function(end, start) {
			return this.DATEDIF(start, end, "D")
		},
		DEGREES: function(val) {
			return 180 / Math.PI * val
		},
		EOMONTH: function(val, i) {
			i = i || 0;
			var dt = this.varToDate(val);
			dt.setUTCMonth(dt.getUTCMonth() + i + 1);
			dt.setUTCDate(0);
			return this.VALUE(dt)
		},
		EXP: function(val) {
			return Math.exp(val)
		},
		FIND: function(val, str, start) {
			return str.indexOf(val, start ? start - 1 : 0) + 1
		},
		FLOOR: function(val, num) {
			if (val * num < 0) {
				return "#NUM!"
			}
			return parseInt(val / num) * num
		},
		FORMULATEXT(val) {
			var grid = val.grid(),
				{
					ri,
					di
				} = val.address(),
				rd = grid.getRowData({
					rowIndx: ri
				}),
				fn = ((rd.pq_fn || {})[di] || {}).fn;
			return fn ? "=" + fn : fn
		},
		HLOOKUP: function(val, arr, row, approx) {
			approx == null && (approx = true);
			arr = this.get2Arr(arr);
			var col = this.MATCH(val, arr[0], approx ? 1 : 0);
			return this.INDEX(arr, row, col)
		},
		XLOOKUP: function(lookupValue, lookupArray, returnArray, matchMode = 0, searchMode = 1) {
			var index = this.MATCH(lookupValue, lookupArray, matchMode);
			return this.INDEX(returnArray, index)
		},
		HOUR: function(val) {
			if (Date.parse(val)) {
				var d = new Date(val);
				return d.getHours()
			} else {
				return val * 24
			}
		},
		HYPERLINK: function(url, text) {
			return text || url
		},
		IF: function(cond, truthy, falsy) {
			return cond ? truthy : falsy
		},
		IFERROR: function(value, value_if_error) {
			if (value !== 0 && !isNaN(value)) {}
			return Math.abs(value) == Infinity || isNaN(value) ? value_if_error : value
		},
		INDEX: function(arr, row, col) {
			arr = this.get2Arr(arr);
			row = row || 1;
			col = col || 1;
			if (pq.isFn(arr[0].push)) {
				return arr[row - 1][col - 1]
			} else {
				return arr[row > 1 ? row - 1 : col - 1]
			}
		},
		INDIRECT: function(ref) {
			return this.iFormula[ref.indexOf(":") > 0 ? "range" : "cell"](ref)
		},
		ISBLANK: function(val) {
			return (val ? val.valueOf() : val) === ""
		},
		LARGE: function(arr, n) {
			arr.sort();
			return arr[arr.length - (n || 1)]
		},
		LEFT: function(val, x) {
			return val.substr(0, x || 1)
		},
		LEN: function(val) {
			val = (val.map ? val : [val]).map(function(val) {
				return val.length
			});
			return val.length > 1 ? val : val[0]
		},
		LOOKUP: function(val, arr1, arr2) {
			arr2 = arr2 || arr1;
			var col = this.MATCH(val, arr1, 1);
			return this.INDEX(arr2, 1, col)
		},
		LOWER: function(val) {
			return (val + "").toLocaleLowerCase()
		},
		_MAXMIN: function(arr, factor) {
			var max, self = this;
			arr.forEach(function(val) {
				if (val != null) {
					val = self.VALUE(val);
					if (self.ISNUMBER(val) && (val * factor > max * factor || max == null)) {
						max = val
					}
				}
			});
			return max != null ? max : 0
		},
		MATCH: function(val, arr, type) {
			var ISNUMBER = this.ISNUMBER(val),
				_isNumber, indx, _val, i = 0,
				len = arr.length;
			type == null && (type = 1);
			val = ISNUMBER ? val : val.toUpperCase();
			if (type === 0) {
				var fn = this.evalify(val);
				for (i = 0; i < len; i++) {
					if (fn(arr[i])) {
						indx = i + 1;
						break
					}
				}
			} else {
				for (i = 0; i < len; i++) {
					_val = arr[i];
					_isNumber = this.ISNUMBER(_val);
					_val = arr[i] = _isNumber ? _val : _val ? _val.toUpperCase() : "";
					if (val == _val) {
						indx = i + 1;
						break
					}
				}
				if (!indx) {
					for (i = 0; i < len; i++) {
						_val = arr[i];
						_isNumber = this.ISNUMBER(_val);
						if (type * (_val < val ? -1 : 1) === 1 && ISNUMBER == _isNumber) {
							indx = i;
							break
						}
					}
					indx = indx == null ? i : indx
				}
			}
			if (indx) {
				return indx
			}
			return "#N/A"
		},
		MAX: function() {
			var arr = pq.flatten(arguments);
			return this._MAXMIN(arr, 1)
		},
		MEDIAN: function() {
			var arr = pq.flatten(arguments).filter(function(val) {
					return val * 1 == val
				}).sort(function(a, b) {
					return b - a
				}),
				len = arr.length,
				len2 = len / 2;
			return len2 === parseInt(len2) ? (arr[len2 - 1] + arr[len2]) / 2 : arr[(len - 1) / 2]
		},
		MID: function(val, x, num) {
			if (x < 1 || num < 0) {
				return "#VALUE!"
			}
			return val.substr(x - 1, num)
		},
		MIN: function() {
			var arr = pq.flatten(arguments);
			return this._MAXMIN(arr, -1)
		},
		MODE: function() {
			var arr = pq.flatten(arguments),
				obj = {},
				freq, rval, rfreq = 0;
			arr.forEach(function(val) {
				freq = obj[val] = obj[val] ? obj[val] + 1 : 1;
				if (rfreq < freq) {
					rfreq = freq;
					rval = val
				}
			});
			if (rfreq < 2) {
				return "#N/A"
			}
			return rval
		},
		MONTH: function(val) {
			return this.varToDate(val).getUTCMonth() + 1
		},
		OR: function() {
			var arr = this.toArray(arguments);
			return eval(arr.join(" || "))
		},
		PI: function() {
			return Math.PI
		},
		POWER: function(num, pow) {
			return Math.pow(num, pow)
		},
		PRODUCT: function() {
			var arr = pq.flatten(arguments),
				a = 1;
			arr.forEach(function(val) {
				a *= val
			});
			return a
		},
		PROPER: function(val) {
			val = val.replace(/(\S+)/g, function(val) {
				return val.charAt(0).toUpperCase() + val.substr(1).toLowerCase()
			});
			return val
		},
		QUARTILE: function(data, quartile) {
			var sortedData = data.slice().sort((a, b) => a - b),
				n = sortedData.length;
			if (quartile == 0) {
				return sortedData[0]
			} else if (quartile == 4) {
				return sortedData[n - 1]
			}
			var percentile = quartile * 25,
				locator = quartile == 1 ? (n + 3) / 4 : quartile == 3 ? (3 * n + 1) / 4 : (n + 1) * percentile / 100,
				whole = Math.floor(locator),
				fraction = locator - whole,
				value = sortedData[whole - 1] + fraction * (sortedData[whole] - sortedData[whole - 1]);
			return value
		},
		RADIANS: function(val) {
			return Math.PI / 180 * val
		},
		RAND: function() {
			return Math.random()
		},
		RANK: function(val, arr, order) {
			var r = JSON.stringify(arr.getRange()),
				self = this,
				key = r + "_range";
			arr = this[key] || function() {
				self[key] = arr;
				return arr.sort(function(a, b) {
					return a - b
				})
			}();
			var i = 0,
				len = arr.length;
			for (; i < len; i++) {
				if (val === arr[i]) {
					return order ? i + 1 : len - i
				}
			}
		},
		RATE: function() {},
		REPLACE: function(val, start, num, _char) {
			val += "";
			return val.substr(0, start - 1) + _char + val.substr(start + num - 1)
		},
		REPT: function(val, num) {
			var str = "";
			while (num--) {
				str += val
			}
			return str
		},
		RIGHT: function(val, x) {
			x = x || 1;
			return val.substr(-1 * x, x)
		},
		_ROUND: function(val, digits, fn) {
			var multi = Math.pow(10, digits),
				val2 = val * multi,
				_int = parseInt(val2),
				frac = val2 - _int;
			if (isNaN(_int) || isNaN(frac)) {
				return "#VALUE!"
			}
			return fn(_int, frac) / multi
		},
		ROUND: function(val, digits) {
			return this._ROUND(val, digits, function(_int, frac) {
				var absFrac = Math.abs(frac);
				return _int + (absFrac >= .5 ? absFrac / frac : 0)
			})
		},
		ROUNDDOWN: function(val, digits) {
			return this._ROUND(val, digits, function(_int) {
				return _int
			})
		},
		ROUNDUP: function(val, digits) {
			return this._ROUND(val, digits, function(_int, frac) {
				return _int + (frac ? Math.abs(frac) / frac : 0)
			})
		},
		ROW: function(val) {
			return (val || this).getRange().r1 + 1
		},
		ROWS: function(arr) {
			var r = arr.getRange();
			return r.r2 - r.r1 + 1
		},
		SEARCH: function(val, str, start) {
			val = val.toUpperCase();
			str = str.toUpperCase();
			return str.indexOf(val, start ? start - 1 : 0) + 1
		},
		SIN: function(val) {
			return Math.sin(val)
		},
		SMALL: function(arr, n) {
			arr.sort();
			return arr[(n || 1) - 1]
		},
		SQRT: function(val) {
			return Math.sqrt(val)
		},
		_STDEV: function(arr) {
			arr = pq.flatten(arr);
			var len = arr.length,
				avg = this._AVERAGE(arr),
				sum = 0;
			arr.forEach(function(x) {
				sum += (x - avg) * (x - avg)
			});
			return [sum, len]
		},
		STDEV: function() {
			var arr = this._STDEV(arguments);
			if (arr[1] === 1) {
				return "#DIV/0!"
			}
			return Math.sqrt(arr[0] / (arr[1] - 1))
		},
		STDEVP: function() {
			var arr = this._STDEV(arguments);
			return Math.sqrt(arr[0] / arr[1])
		},
		SUBSTITUTE: function(text, old, new_text, indx) {
			var a = 0;
			return text.replace(new RegExp(old, "g"), function() {
				a++;
				return indx ? a === indx ? new_text : old : new_text
			})
		},
		SUM: function() {
			var arr = pq.flatten(arguments),
				sum = 0,
				self = this;
			arr.forEach(function(val) {
				val = self.VALUE(val);
				if (self.ISNUMBER(val)) {
					sum += parseFloat(val)
				}
			});
			return sum
		},
		SUMIF: function(range, cond, sum_range) {
			return this.SUMIFS(sum_range || range, range, cond)
		},
		SUMIFS: function() {
			var args = this.reduce(arguments),
				sum_range = args.shift();
			return this._IFS(args, function(condIndx) {
				return sum_range[condIndx]
			})
		},
		SUMPRODUCT: function() {
			var arr = this.toArray(arguments);
			arr = arr[0].map(function(val, i) {
				var prod = 1;
				arr.forEach(function(_arr) {
					var val = _arr[i];
					prod *= parseFloat(val) == val ? val : 0
				});
				return prod
			});
			return pq.aggregate.sum(arr)
		},
		TAN: function(val) {
			return Math.tan(val)
		},
		TEXT: function(val, format) {
			return pq.formatNumber(val, format, this.locale)
		},
		TIME: function(h, m, s) {
			return (h + m / 60 + s / 3600) / 24
		},
		TIMEVALUE: function(val) {
			if (val.getTime) {
				return (val.getUTCHours() + val.getUTCMinutes() / 60 + val.getUTCSeconds() / 3600) / 24
			}
			var m = val.match(this.reTime);
			if (m == null && this.reDate.test(val)) {
				return 0
			}
			if (m && m[1] != null && (m[3] != null || m[7] != null)) {
				var mH = m[1] * 1,
					mM = (m[3] || 0) * 1,
					mS = (m[5] || 0) * 1,
					am = (m[7] || "").toUpperCase(),
					v = mH + mM / 60 + mS / 3600
			}
			if (0 <= v && (am && v < 13 || !am && v < 24)) {
				if (am == "PM" && mH < 12) {
					v += 12
				} else if (am == "AM" && mH == 12) {
					v -= 12
				}
				return v / 24
			}
			return "#VALUE!"
		},
		TODAY: function() {
			var d = new Date;
			return this.VALUE(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())))
		},
		TRIM: function(val) {
			return val.replace(/^\s+|\s+$/gm, "")
		},
		TRUNC: function(val, num) {
			num = Math.pow(10, num || 0);
			return ~~(val * num) / num
		},
		UNIQUE: function(val) {
			return pq.arrayUnique(val)
		},
		UPPER: function(val) {
			return (val + "").toLocaleUpperCase()
		},
		VALUE: function(val) {
			var m, val2;
			if (!val) {
				val2 = 0
			} else if (parseFloat(val) == val) {
				val2 = parseFloat(val)
			} else if (this.isDateTime(val)) {
				val2 = this.DATEVALUE(val) + this.TIMEVALUE(val) * 1
			} else if (m = val.match(this.reTime)) {
				val2 = this.TIMEVALUE(val)
			} else {
				val2 = val.replace(/[^0-9\-.]/g, "");
				val2 = val2.replace(/(\.[1-9]*)0+$/, "$1").replace(/\.$/, "")
			}
			return val2
		},
		VAR: function() {
			var arr = this._STDEV(arguments);
			return arr[0] / (arr[1] - 1)
		},
		VARP: function() {
			var arr = this._STDEV(arguments);
			return arr[0] / arr[1]
		},
		VLOOKUP: function(val, arr, col, approx) {
			approx == null && (approx = true);
			arr = this.get2Arr(arr);
			var arrCol = arr.map(function(arr) {
					return arr[0]
				}),
				row = this.MATCH(val, arrCol, approx ? 1 : 0);
			return this.INDEX(arr, row, col)
		},
		YEAR: function(val) {
			return this.varToDate(val).getUTCFullYear()
		}
	};
	f.reDate1 = new RegExp("^" + f.strDate1 + "$");
	f.reDate2 = new RegExp("^" + f.strDate2 + "$");
	f.reDate3 = new RegExp("^" + f.strDate3 + "$");
	f.reDate = new RegExp("^" + f.strDate1 + "$|^" + f.strDate2 + "$|^" + f.strDate3 + "$");
	f.reTime = new RegExp("(?:^|\\s|T)" + f.strTime + "$", "i");
	f.reDateTime = new RegExp("^(" + f.strDate1 + ")\\s" + f.strTime + "$|^(" + f.strDate2 + ")(?:\\s|T)" + f.strTime + "$|^(" + f.strDate3 + ")\\s" + f.strTime + "$")
})(jQuery);
(function($) {
	pq.Select = function(options, $ele, onPopupRemove) {
		var appendTo = document.body,
			$grid = $("<div/>").appendTo(appendTo);
		pq.grid($grid, $.extend({
			width: "flex",
			height: "flex",
			autoRow: false,
			rowBorders: false,
			columnBorders: false,
			editable: false,
			numberCell: {
				show: false
			},
			hoverMode: "row",
			fillHandle: "",
			stripeRows: false,
			showTop: false,
			showHeader: false
		}, options));
		pq.makePopup($grid[0], $ele[0], {
			onPopupRemove: onPopupRemove
		});
		pq.position($grid, {
			my: "left top",
			at: "left bottom",
			of: $ele
		});
		return $grid
	}
})(jQuery);
(function($) {
	var cPrimary = function(that) {
		this.options = that.options
	};
	cPrimary.prototype = {
		empty: function() {
			for (var key in this) {
				if (key.indexOf("_") == 0) {
					delete this[key]
				}
			}
			delete this.options.dataModel.dataPrimary
		},
		getCM: function() {
			return this._cm
		},
		setCM: function(_cm) {
			this._cm = _cm
		},
		getCols: function() {
			return this._columns
		},
		setCols: function(val) {
			this._columns = val
		},
		getDMData: function() {
			return this.options.dataModel.dataPrimary
		},
		setDMData: function(val) {
			this.options.dataModel.dataPrimary = val
		},
		getOCM: function() {
			return this._ocm
		},
		setOCM: function(v) {
			this._ocm = v
		}
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance,
			p = grid.Group();
		p.primary = new cPrimary(grid);
		grid.on("beforeFilterDone", p.onBeforeFilterDone.bind(p)).one("CMInit", p.oneCMInit.bind(p))
	});
	var old = {},
		_p = {
			clearPivot: function(wholeData) {
				if (this.isPivot()) {
					var that = this.that,
						DM = that.options.dataModel,
						primary = this.primary,
						OCM = primary.getOCM(),
						DMData = primary.getDMData();
					OCM && that.refreshCM(OCM);
					if (wholeData) {
						if (!DMData) {
							throw "!primary.getDMData"
						}
						DM.data = DMData
					} else if (DMData) {
						DM.data = DMData
					}
					this.primary.empty();
					this.setPivot(false);
					return true
				}
			},
			getColsPrimary: function() {
				return this.primary.getCols() || this.that.columns
			},
			getCMPrimary: function() {
				return this.primary.getCM() || this.that.colModel
			},
			getOCMPrimary: function() {
				return this.primary.getOCM() || this.that.options.colModel
			},
			getSumCols: function() {
				var b = ")" + (this.that.options.rtl ? "&lrm;" : "");
				return (old.getSumCols.call(this) || []).map(function(col) {
					return [col.dataIndx, col.dataType, col.summary, col.summary.type + "(" + col.title + b, col.width, col.format, col.showifOpen]
				})
			},
			getVal: function() {
				return this._pivot ? function(rd, di) {
					return rd[di]
				} : old.getVal.apply(this, arguments)
			},
			groupData: function() {
				var self = this,
					that = self.that,
					o = that.options,
					GM = o.groupModel,
					GMdataIndx = GM.dataIndx,
					old_GMdataIndx, oldTitleInFirstCol, oldTitleIndx, oldMerge, groupCols = GM.groupCols,
					primary = self.primary,
					primaryData, groupColsLen = groupCols.length;
				if ((primaryData = primary.getDMData()) && primaryData[0] != that.pdata[0]) {
					return
				}
				if (GM.pivot) {
					old_GMdataIndx = GMdataIndx.slice();
					GM.dataIndx = GMdataIndx = GMdataIndx.concat(groupCols);
					oldTitleInFirstCol = GM.titleInFirstCol;
					oldTitleIndx = GM.titleIndx;
					oldMerge = GM.merge;
					GM.titleInFirstCol = false;
					GM.titleIndx = null;
					GM.merge = false
				}
				old.groupData.call(self);
				if (GM.pivot) {
					that.pdata = that.pdata.reduce(function(arr, rd) {
						if (rd.pq_gtitle) {
							arr.push(rd)
						}
						return arr
					}, []);
					if (oldTitleIndx) {
						GM.titleInFirstCol = oldTitleInFirstCol;
						GM.titleIndx = oldTitleIndx
					} else if (old_GMdataIndx.length > 1) {
						GM.merge = oldMerge
					}
					self.pivotData(GMdataIndx, old_GMdataIndx);
					GM.dataIndx = old_GMdataIndx.slice(0, old_GMdataIndx.length - 1);
					GM.summaryInTitleRow = "all";
					if (groupColsLen) {
						var di1 = oldTitleIndx,
							di2 = old_GMdataIndx[old_GMdataIndx.length - 1];
						old.groupData.call(self, true);
						if (oldTitleIndx && di1 != di2) that.pdata.forEach(function(rd) {
							if (!rd.pq_gtitle) rd[di1] = rd[di2]
						})
					} else if (oldTitleIndx) {
						that.pdata.forEach(function(rd) {
							rd[oldTitleIndx] = rd[[GMdataIndx[rd.pq_level]]]
						})
					}
					GM.dataIndx = old_GMdataIndx;
					self.setPivot(true)
				}
				that._trigger("groupData")
			},
			isPivot: function() {
				return this._pivot
			},
			getSorter: function(column) {
				var pivotColSortFn = column.pivotSortFn,
					dt;
				if (!pivotColSortFn) {
					dt = pq.getDataType(column);
					pivotColSortFn = dt == "number" ? function(a, b) {
						return a.sortby * 1 > b.sortby * 1 ? 1 : -1
					} : function(a, b) {
						return a.sortby > b.sortby ? 1 : -1
					}
				}
				return pivotColSortFn
			},
			nestedCM: function(sumCols, GM) {
				var self = this,
					groupCols = GM.groupCols,
					pivotColsTotal = GM.pivotColsTotal,
					showifOpenForAggr = pivotColsTotal == "hideifOpen" ? false : null,
					sorters = [],
					dts = [],
					that = self.that,
					columns = that.columns;
				columns = groupCols.map(function(di) {
					var col = columns[di];
					sorters.push(self.getSorter(col));
					dts.push(pq.getDataType(col));
					return col
				});
				return function nestedCM(objCM, level, labelArr) {
					level = level || 0;
					labelArr = labelArr || [];
					var i = 0,
						column, arr, col, dt, title, colModel, aggr, aggrCM, CM = [];
					if ($.isEmptyObject(objCM)) {
						for (; i < sumCols.length; i++) {
							column = sumCols[i];
							arr = labelArr.slice();
							arr.push(column[0]);
							col = {
								dataIndx: arr.join("_"),
								dataType: column[1],
								summary: column[2],
								title: column[3],
								width: column[4],
								format: column[5],
								showifOpen: column[6]
							};
							CM.push(col)
						}
					} else {
						column = columns[level];
						dt = dts[level];
						for (title in objCM) {
							aggr = title === "aggr";
							arr = labelArr.slice();
							arr.push(title);
							colModel = nestedCM(objCM[title], level + 1, arr);
							if (aggr) {
								aggrCM = colModel;
								aggrCM.forEach(function(col) {
									col.showifOpen = showifOpenForAggr;
									col.type = "aggr"
								})
							} else {
								col = {
									showifOpen: true,
									sortby: title,
									title: that.formatCol(column, title, dt),
									colModel: colModel
								};
								if (colModel.length > 1 && !colModel.find(function(col) {
										return !col.type
									}).dataIndx) {
									col.collapsible = {
										on: true,
										last: null
									}
								}
								CM.push(col)
							}
						}
						CM.sort(sorters[level]);
						if (aggrCM) CM[pivotColsTotal == "before" ? "unshift" : "push"].apply(CM, aggrCM)
					}
					return CM
				}
			},
			onBeforeFilterDone: function(evt, ui) {
				if (this.isPivot()) {
					var rules = ui.rules,
						cols = this.primary.getCols(),
						i = 0,
						rule;
					for (; i < rules.length; i++) {
						rule = rules[i];
						if (!cols[rule.dataIndx]) {
							return false
						}
					}
					this.clearPivot(true);
					ui.header = true
				}
			},
			oneCMInit: function() {
				this.updateAgg(this.that.options.groupModel.agg)
			},
			option: function(ui, refresh, source, fn) {
				var self = this;
				self.clearPivot();
				old.option.call(self, ui, refresh, source, fn)
			},
			pivotData: function(GPMdataIndx, GMdataIndx) {
				var that = this.that,
					sumCols = this.getSumCols(),
					sumDIs = this.getSumDIs(),
					o = that.options,
					GM = o.groupModel,
					primary = this.primary,
					data = that.pdata,
					columns = that.columns,
					col0, titleIndx = GM.titleIndx,
					CM;
				if (titleIndx) {
					col0 = columns[titleIndx];
					CM = [col0].concat(GMdataIndx.reduce(function(_CM, di) {
						if (di != titleIndx) {
							_CM.push($.extend({
								hidden: true
							}, columns[di]))
						}
						return _CM
					}, []))
				} else {
					CM = GMdataIndx.map(function(di) {
						return columns[di]
					})
				}
				var objCM = this.transformData(data, sumDIs, GPMdataIndx, GMdataIndx),
					CM2 = this.nestedCM(sumCols, GM)(objCM),
					ui = {};
				ui.CM = CM = CM.concat(CM2);
				that._trigger("pivotCM", null, ui);
				primary.setOCM(o.colModel);
				primary.setCM(that.colModel);
				primary.setCols(that.columns);
				that.refreshCM(ui.CM, {
					pivot: true
				})
			},
			setPivot: function(val) {
				this._pivot = val
			},
			transformData: function(data, sumDIs, GPMdataIndx, GMdataIndx) {
				var self = this,
					add, prev_level, pdata = [],
					new_rd, that = this.that,
					primary = this.primary,
					masterRow = {},
					arr, labelArr = [],
					o = that.options,
					DM = o.dataModel,
					GM = o.groupModel,
					pivotColsTotal = GM.pivotColsTotal,
					GMLen = GMdataIndx.length,
					objCM = {},
					GPMLen = GPMdataIndx.length;
				if (GMLen == GPMLen) {
					data.forEach(function(rd) {
						if (rd.pq_level == GMLen - 1) {
							delete rd.children;
							delete rd.pq_gtitle
						}
					});
					self.updateItems(data);
					pdata = data
				} else {
					data.forEach(function(rd) {
						var level = rd.pq_level,
							PM_level = level - GMLen,
							_objCM = objCM,
							di = GPMdataIndx[level],
							val = rd[di],
							i, _val;
						if (PM_level >= 0) {
							labelArr[PM_level] = val;
							for (i = 0; i < PM_level + 1; i++) {
								_val = labelArr[i];
								_objCM = _objCM[_val] = _objCM[_val] || {}
							}
						}
						if (level === GPMLen - 1) {
							sumDIs.forEach(function(sumDI) {
								arr = labelArr.slice();
								arr.push(sumDI);
								new_rd[arr.join("_")] = rd[sumDI]
							})
						} else {
							if (!new_rd || prev_level > level && level < GMLen) {
								new_rd = {
									pq_gid: self.idCount++
								};
								add = true
							}
							if (level < GMLen) {
								masterRow[di] = new_rd[di] = val
							}
							if (pivotColsTotal) {
								if (level <= GPMLen - 2 && level >= GMLen - 1) {
									sumDIs.forEach(function(sumDI) {
										arr = labelArr.slice(0, PM_level + 1);
										arr.push("aggr");
										arr.push(sumDI);
										new_rd[arr.join("_")] = rd[sumDI]
									})
								}
							}
						}
						prev_level = level;
						if (add) {
							pdata.push(new_rd);
							GMdataIndx.forEach(function(di) {
								if (new_rd[di] === undefined) {
									new_rd[di] = masterRow[di]
								}
							});
							add = false
						}
					})
				}
				primary.setDMData(DM.data);
				DM.data = that.pdata = pdata;
				if (pivotColsTotal) this.addAggrInCM(objCM, GM.pivotTotalForSingle);
				return objCM
			},
			addAggrInCM: function(CM, pivotTotalForSingle) {
				var count = 0,
					key;
				for (key in CM) {
					count++;
					this.addAggrInCM(CM[key], pivotTotalForSingle)
				}
				if (count > (pivotTotalForSingle ? 0 : 1)) {
					CM.aggr = {}
				}
			},
			updateAgg: function(agg, oldAgg) {
				var cols = this.that.columns,
					key;
				if (oldAgg) {
					for (key in oldAgg) {
						cols[key].summary = null
					}
				}
				if (agg) {
					for (key in agg) {
						cols[key].summary = {
							type: agg[key]
						}
					}
				}
			}
		},
		p = $.paramquery.cGroup.prototype;
	for (var method in _p) {
		old[method] = p[method];
		p[method] = _p[method]
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	_pq.pqGrid.defaults.toolPanel = {};
	_pq.pqGrid.prototype.ToolPanel = function() {
		return this.iToolPanel
	};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iToolPanel = new _pq.cToolPanel(grid)
	});
	_pq.cToolPanel = function(that) {
		var self = this;
		self.that = that;
		self.panes = [];
		self.clsSort = "pq-sortable";
		that.one("render", self.init.bind(self))
	};
	_pq.cToolPanel.prototype = {
		getArray: function($ele) {
			return $ele.find(".pq-pivot-col").get().map(function(col) {
				return col.dataset.di
			})
		},
		getInit: function() {
			return this._inited
		},
		getObj: function($ele) {
			var obj = {};
			$ele.find(".pq-pivot-col").each(function(i, col) {
				obj[col.dataset.di] = col.getAttribute("type") || "sum"
			});
			return obj
		},
		getSortCancel: function() {
			return this._sortCancel
		},
		_hide: function(hide) {
			this.$ele[hide ? "hide" : "show"]();
			this.init();
			this.that.refresh({
				soft: true
			})
		},
		hide: function() {
			this._hide(true)
		},
		disablePivotChkBox: function(val) {
			this.$pivotChk.prop("disabled", val)
		},
		init: function() {
			var self = this,
				that = self.that,
				$ele = self.$ele = that.$toolPanel;
			if (self.isVisible() && !self.getInit()) {
				var o = that.options,
					TPM = o.toolPanel,
					GM = o.groupModel,
					labelCls = " pq-pivot-label pq-bg-3 ",
					cls = " pq-pivot-pane pq-border-1 ",
					hideColPane = self.isHideColPane(),
					hidePivotChkBox = TPM.hidePivotChkBox,
					disablePivotChkBox = TPM.disablePivotChkBox,
					pivot_checked = GM.pivot ? "checked" : "",
					group_checked = GM.on ? "checked" : "",
					clsSort = self.clsSort;
				$ele.html(["<div class='pq-pivot-cols-all", cls, "'>", "<div class='", clsSort, "' style='", hidePivotChkBox ? "padding-top:0;" : "", "'></div>", hidePivotChkBox ? "" : ["<div class='", labelCls, "'>", "<label><input type='checkbox' ", disablePivotChkBox ? "disabled" : "", " class='pq-pivot-checkbox' ", pivot_checked, "/>", o.strTP_pivot, "</label>", "</div>"].join(""), "</div>", "<div class='pq-pivot-rows", cls, "' style='display:", TPM.hideRowPane ? "none" : "", ";'>", "<div deny='denyGroup' class='", clsSort, "'></div>", "<div class='", labelCls, "'>", TPM.hideGroupChkBox ? "<span class='pq-icon-pivot-rows'></span>" + o.strTP_rowPane : "<label><input type='checkbox' class='pq-group-checkbox' " + group_checked + "/>" + o.strTP_rowPane + "</label>", "</div>", "</div>", "<div class='pq-pivot-cols", cls, "' style='display:", hideColPane ? "none" : "", ";'>", "<div deny='denyPivot' class='", clsSort, "'></div>", "<div class='", labelCls, "'><span class='pq-icon-pivot-cols'></span>", o.strTP_colPane, "</div>", "</div>", "<div class='pq-pivot-vals", cls, "' style='display:", TPM.hideAggPane ? "none" : "", ";'>", "<div deny='denyAgg' class='", clsSort, "'></div>", "<div class='", labelCls, "'><span class='pq-icon-pivot-vals'></span>", o.strTP_aggPane, "</div>", "</div>"].join(""));
				self.$pivotChk = $ele.find(".pq-pivot-checkbox").on("click", self.onPivotChange(self, that));
				self.$groupChk = $ele.find(".pq-group-checkbox").on("click", self.onGroupChange(self, that));
				self.$colsAll = $ele.find(".pq-pivot-cols-all>." + clsSort);
				self.$colsPane = $ele.find(".pq-pivot-cols");
				self.$cols = $ele.find(".pq-pivot-cols>." + clsSort);
				self.$rows = $ele.find(".pq-pivot-rows>." + clsSort);
				self.$aggs = $ele.find(".pq-pivot-vals>." + clsSort).on("click contextmenu", self.onClick.bind(self));
				that.on("refreshFull", self.setHt.bind(self)).on("groupOption", self.onGroupOption.bind(self));
				setTimeout(function() {
					if (that.element) {
						that.on("CMInit", self.onCMInit.bind(self));
						self.render()
					}
				});
				self.setInit()
			}
		},
		isHideColPane: function() {
			var o = this.that.options;
			return o.toolPanel.hideColPane || !o.groupModel.pivot
		},
		isDeny: function($source, $dest, $item) {
			var deny = $dest.attr("deny"),
				that = this.that,
				columns = that.iGroup.getColsPrimary(),
				col = columns[$item[0].dataset.di];
			return col[deny]
		},
		isVisible: function() {
			return this.$ele.is(":visible")
		},
		onCMInit: function(evt, ui) {
			if (!ui.pivot && !ui.flex && !ui.group && !this.that.Group().isPivot()) this.refresh()
		},
		onClick: function(evt) {
			var $target = $(evt.target),
				self = this,
				that = self.that;
			if (!self.$popup && $target.hasClass("pq-pivot-col")) {
				var di = $target[0].dataset.di,
					col = that.iGroup.getColsPrimary()[di],
					aggOptions = that.iGroup.getAggOptions(col.dataType).sort(),
					options = {
						dataModel: {
							data: aggOptions.map(function(item) {
								return [item]
							})
						},
						colModel: [{
							title: col.title,
							width: 100
						}, {
							width: 28,
							title: "",
							minWidth: 28,
							render: function(ui) {
								return ui.rowData[0] == (col.summary || {}).type ? "<span class='ui-icon ui-icon-check'></span>" : ""
							}
						}],
						showHeader: true,
						destroy: function() {
							self.$popup = null
						},
						cellClick: function(evt, ui) {
							var type = ui.rowData[0];
							$target.attr("type", type);
							setTimeout(function() {
								self.$popup.remove();
								self.refreshGrid();
								self.refresh()
							})
						}
					};
				self.$popup = pq.Select(options, $target);
				return false
			}
		},
		onGroupOption: function(evt, ui) {
			if (ui.source != "tp") {
				var oldGM = ui.oldGM,
					GM = this.that.options.groupModel;
				if (GM.groupCols != oldGM.groupCols || GM.agg != oldGM.agg || GM.dataIndx != oldGM.dataIndx || GM.pivot != oldGM.pivot) this.refresh()
			}
		},
		onPivotChange: function(self, that) {
			return function() {
				that.Group().option({
					pivot: !!this.checked
				}, null, "tp");
				self.showHideColPane()
			}
		},
		onGroupChange: function(self, that) {
			return function() {
				that.Group().option({
					on: !!this.checked
				}, null, "tp")
			}
		},
		ph: function(str) {
			return "<span style='color:#999;margin:1px;display:inline-block;'>" + str + "</span>"
		},
		refreshGrid: function() {
			var self = this,
				that = self.that,
				cols = self.getArray(self.$cols),
				aggs = self.getObj(self.$aggs),
				rows = self.getArray(self.$rows);
			that.Group().option({
				groupCols: cols,
				dataIndx: rows,
				agg: aggs
			}, null, "tp");
			setTimeout(function() {
				self.refresh()
			})
		},
		onReceive: function(evt, ui) {
			if (this.getSortCancel()) {
				return this.setSortCancel(false)
			}
			this.refreshGrid()
		},
		onOver: function(self) {
			return function(evt, ui) {
				var $dest = $(this),
					$item = ui.item,
					$source = $item.parent(),
					add = "addClass",
					remove = "removeClass",
					isDeny = $source[0] != $dest[0] ? self.isDeny($source, $dest, $item) : false;
				ui.helper.find(".ui-icon")[isDeny ? add : remove]("ui-icon-closethick")[isDeny ? remove : add]("ui-icon-check")
			}
		},
		onStop: function(self) {
			return function(evt, ui) {
				var $source = $(this),
					$item = ui.item,
					$dest = $item.parent();
				if ($source[0] != $dest[0]) {
					if (self.isDeny($source, $dest, $item)) {
						$source.sortable("cancel");
						self.setSortCancel(true)
					}
				}
			}
		},
		onTimer: function() {
			var timeID;
			return function(evt, ui) {
				clearTimeout(timeID);
				var self = this;
				timeID = setTimeout(function() {
					self.onReceive(evt, ui)
				})
			}
		}(),
		refresh: function() {
			var self = this;
			if (self.that.element.is(":visible")) {
				self.setHtml();
				$(self.panes).sortable("refresh")
			} else self.pendingRefresh = true
		},
		render: function() {
			var self = this,
				connectSort = "." + self.clsSort,
				scale, that = self.that;
			if (!that.element) {
				return
			}
			self.panes = [self.$colsAll, self.$cols, self.$rows, self.$aggs];
			self.setHtml();
			$(self.panes).sortable({
				appendTo: self.$ele,
				connectWith: connectSort,
				distance: 5,
				containment: self.$ele,
				cursor: "move",
				items: "> .pq-pivot-col:not('.pq-deny-drag')",
				helper: function(evt, ele) {
					return ele.clone(true).css({
						opacity: "0.8"
					}).prepend("<span class='ui-icon-check ui-icon'></span>")
				},
				start: function() {
					scale = that.getScale()
				},
				sort: function(evt, ui) {
					ui.helper.css({
						left: ui.position.left / scale[0],
						top: ui.position.top / scale[1]
					})
				},
				receive: self.onTimer.bind(self),
				stop: self.onStop(self),
				over: self.onOver(self),
				update: self.onTimer.bind(self),
				tolerance: "pointer"
			});
			that._trigger("tpRender")
		},
		setHtml: function() {
			var self = this,
				that = self.that,
				htmlColsAll = [],
				htmlCols = [],
				htmlRows = [],
				htmlVals = [],
				template = self.template,
				templateVals = self.templateVals,
				objGPM = {},
				o = that.options,
				Group = that.iGroup,
				columns = Group.getColsPrimary(),
				CM = Group.getCMPrimary(),
				col, di, GM = o.groupModel,
				GMdataIndx = GM.dataIndx,
				groupCols = GM.groupCols,
				i = 0,
				clen = CM.length,
				groupChk = self.$groupChk[0],
				pivotChk = self.$pivotChk[0];
			GMdataIndx.concat(groupCols).forEach(function(di) {
				objGPM[di] = 1
			});
			if (groupChk) groupChk.checked = GM.on;
			if (pivotChk) pivotChk.checked = GM.pivot;
			self.showHideColPane();
			for (; i < clen; i++) {
				col = CM[i];
				di = col.dataIndx;
				if (col.tpHide || objGPM[di]) {} else if (col.summary && col.summary.type) {
					htmlVals.push(templateVals(di, col))
				} else {
					htmlColsAll.push(template(di, col))
				}
			}
			GMdataIndx.forEach(function(di) {
				htmlRows.push(template(di, columns[di]))
			});
			groupCols.forEach(function(di) {
				htmlCols.push(template(di, columns[di]))
			});
			self.$colsAll.html(htmlColsAll.join(""));
			self.$rows.html(htmlRows.join("") || self.ph(o.strTP_rowPH));
			self.$cols.html(htmlCols.join("") || self.ph(o.strTP_colPH));
			self.$aggs.html(htmlVals.join("") || self.ph(o.strTP_aggPH))
		},
		setAttrPanes: function() {
			this.$ele.attr("panes", this.panes.filter(function($ele) {
				return $ele.is(":visible")
			}).length)
		},
		setHt: function() {
			var self = this;
			self.$ele.height(this.$ele.parent()[0].offsetHeight);
			if (self.pendingRefresh) {
				self.pendingRefresh = false;
				self.refresh()
			}
		},
		setSortCancel: function(val) {
			this._sortCancel = val
		},
		setInit: function() {
			this._inited = true
		},
		show: function() {
			this._hide(false)
		},
		showHideColPane: function() {
			var self = this;
			self.$colsPane.css("display", self.isHideColPane() ? "none" : "");
			self.setAttrPanes()
		},
		template: function(di, col) {
			return ["<div data-di='", di, "' class='pq-pivot-col pq-border-2 ", col.tpCls || "", "'>", col.title, "</div>"].join("")
		},
		templateVals: function(di, col) {
			var type = col.summary.type;
			return ["<div data-di='", di, "' type='", type, "' class='pq-pivot-col pq-border-2 ", col.tpCls || "", "'>", type, "(", col.title, ")</div>"].join("")
		},
		toggle: function() {
			this._hide(this.isVisible())
		}
	}
})(jQuery);
(function($) {
	pq.mixin.HeadTP = {
		getCM: function() {
			var title = this.that.options.strSelectAll || "Select All",
				n = null,
				nested = this.nested,
				col1 = {
					editor: false,
					dataIndx: "title",
					title: title,
					filter: {
						crules: [{
							condition: "contain"
						}]
					},
					type: nested ? n : "checkbox",
					cbId: nested ? n : "visible"
				},
				col2 = {
					hidden: true,
					dataIndx: "visible",
					dataType: "bool",
					editable: function(ui) {
						return !ui.rowData.pq_disable
					},
					cb: nested ? n : {
						header: true
					}
				};
			return [col1, col2]
		},
		isToolPanel: function() {},
		getData: function() {
			var id = 1,
				self = this,
				isExport = self.tab == "export",
				prop = isExport ? "skipExport" : "hidden",
				that = self.that,
				CM = self.isToolPanel() ? that.getOCMPrimary() : null,
				iRH = that.iRenderHead;
			return that.Columns().reduce(function(col) {
				var ci = this.getColIndx({
						column: col
					}),
					visible = !col[prop],
					hasChild = col.childCount;
				if (!col.menuInHide && (!col.collapsible || isExport)) {
					if (hasChild) {
						self.nested = true
					}
					return {
						visible: hasChild ? undefined : visible,
						get title() {
							return hasChild ? col.title : iRH.getTitle(col, ci) || col.dataIndx
						},
						column: col,
						id: id++,
						pq_disable: col.menuInDisable,
						pq_close: col.menuInClose,
						colModel: hasChild ? col.colModel : undefined
					}
				}
			}, CM)
		},
		getGridObj: function(ui) {
			var self = this,
				gridOptions = "gridOptions",
				that = self.that;
			return $.extend({
				sideBar: "",
				dataModel: {
					data: self.getData()
				},
				rtl: that.options.rtl,
				colModel: self.getCM(),
				check: self.onChange.bind(self),
				treeExpand: self.onTreeExpand.bind(self),
				treeModel: self.nested ? {
					dataIndx: "title",
					childstr: "colModel",
					checkbox: true,
					checkboxHead: true,
					cbId: "visible",
					cascade: true
				} : undefined
			}, that.options.menuUI[gridOptions], ui)
		},
		onChange: function(evt, ui) {
			if (ui.init) {
				return
			}
			var diShow = [],
				diExport = [],
				that = this.that,
				isExport = this.tab == "export",
				diHide = [];
			(ui.getCascadeList ? ui.getCascadeList() : ui.rows).forEach(function(obj) {
				var rd = obj.rowData,
					visible = rd.visible,
					column = rd.column,
					di = column.dataIndx,
					CM = column.colModel || [];
				if (!CM.length) {
					if (isExport) {
						diExport.push(di);
						column.skipExport = !visible
					} else if (visible) diShow.push(di);
					else diHide.push(di)
				}
			});
			if (isExport) {
				that.refreshCM();
				that._trigger("skipExport", null, {
					di: diExport
				})
			} else that.Columns().hide({
				diShow: diShow,
				diHide: diHide
			})
		},
		onTreeExpand: function(evt, ui) {
			ui.nodes.forEach(function(rd) {
				rd.column.menuInClose = ui.close
			})
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iHeaderMenu = new cHeaderMenu(grid);
		grid.HeaderMenu = function() {
			return grid.iHeaderMenu
		}
	});

	function cHeaderMenu(that) {
		var self = this;
		self.that = that;
		self.rtl = that.options.rtl;
		that.on("headerCellClick", self.onHeadCellClick.bind(self)).on("destroy", self.onDestroy.bind(self))
	}
	cHeaderMenu.prototype = $.extend({}, pq.mixin.HeadTP, {
		close: function() {
			this.$popup.remove()
		},
		popup: function() {
			return this.$popup
		},
		openFilterTab: function() {
			var index = this.menuH.tabs.findIndex(function(tab) {
				return tab == "filter"
			});
			this.$tabs.tabs("option", "active", index);
			return this.filterMenu
		},
		FilterMenu: function() {
			return this.filterMenu
		},
		onDestroy: function() {
			var $popup = this.$popup;
			if ($popup) $popup.remove();
			delete this.$popup
		},
		onHeadCellClick: function(evt, ui) {
			var self = this,
				$target = $(evt.originalEvent.target);
			if ($target.hasClass("pq-icon-filter")) {
				return self.onFilterClick(evt, ui, $target)
			} else if ($target.hasClass("pq-icon-menu") || ui.colIndx == -1) {
				return self.onMenuClick(evt, ui, $target)
			}
		},
		getMenuHtml: function(tabs) {
			var str = this.that.options.strMenu,
				icons = {
					hideCols: "visible",
					filter: "filter",
					export: "download"
				},
				li = tabs.map(function(tab) {
					return ['<li title="', str[tab], '"><a href="#tabs-', tab, '"><span class="pq-icon-tab-', icons[tab], '">&nbsp;</span></a></li>'].join("")
				}).join(""),
				div = tabs.map(function(tab) {
					return '<div id="tabs-' + tab + '"></div>'
				}).join("");
			return ["<div class='pq-head-menu pq-theme' dir='", this.rtl ? "rtl" : "ltr", "'>", "<div class='pq-tabs' style='border-width:0;'>", "<ul>", li, "</ul>", div, "</div>", "</div>"].join("")
		},
		getMenuH: function(options, column) {
			return $.extend({}, options.menuUI, (column || options.numberCell).menuUI)
		},
		activate: function(id, column) {
			var self = this,
				tabs = self.tabs,
				tab = self.tab = tabs[id],
				$panel = $("#tabs-" + tab);
			if ($panel.children().length == 0) {
				if (tab == "hideCols" || tab == "export") {
					var $grid = self.$grid = $("<div/>").appendTo($panel);
					pq.grid($grid, self.getGridObj())
				} else if (tab == "filter") {
					self.appendFilter($panel, column)
				}
			} else {
				$panel.find(".pq-grid").pqGrid("refresh")
			}
		},
		open: function(di, evt, $target) {
			var self = this,
				that = self.that,
				o = that.options,
				column = that.columns[di],
				menuH = self.menuH = self.getMenuH(o, column),
				tabs = self.tabs = menuH.tabs;
			evt = evt || that.getCellHeader({
				dataIndx: di
			});
			if (!tabs || !tabs.length) {
				return
			}
			var $popup = self.$popup = $(self.getMenuHtml(tabs)).appendTo(document.body),
				tabLen = tabs.length,
				activeId = localStorage["pq-menu-tab"] || 1,
				$tabs = self.$tabs = $popup.find(".pq-tabs");
			if (activeId > tabLen - 1) activeId = tabLen - 1;
			pq.makePopup($popup[0], $target[0], {
				onPopupRemove: function() {
					self.$popup = null;
					that.focusHead({
						ri: that.headerCells.length - 1,
						colIndx: that.colModel.indexOf(column)
					})
				},
				keepPopupWithoutEle: true,
				closeOnEle: true
			});
			pq.position($popup, {
				my: "left top",
				at: "left bottom",
				of: $target || evt
			});
			self.activate(activeId, column);
			$tabs.tabs({
				active: activeId,
				activate: function(evt, ui) {
					activeId = $(this).tabs("option", "active");
					localStorage["pq-menu-tab"] = activeId;
					self.activate(activeId, column)
				}
			});
			$popup.resizable({
				handles: "e,w",
				maxWidth: 600,
				minWidth: 220
			});
			pq.focusEle(null, $popup);
			return this
		},
		onMenuClick: function(evt, ui, $target) {
			this.open(ui.dataIndx, evt, $target);
			return false
		},
		appendFilter: function($cont, column, filterRow, filterPanel) {
			var self = this,
				grid = self.that,
				$div = $("<div class='pq-filter-menu pq-theme'/>").appendTo($cont),
				$popup = self.$popup || $div,
				filterMenu = self.filterMenu = new pq.cFilterMenu(filterPanel),
				html;
			self.filterPanel = filterPanel;
			var ui2 = {
				filterRow: filterRow,
				grid: grid,
				column: column,
				$popup: $popup,
				menuH: this.menuH || this.getMenuH(grid.options, column)
			};
			filterMenu.init(ui2);
			html = filterMenu.getHtml();
			$div.html(html);
			filterMenu.ready($div.children().get());
			filterMenu.addEvents();
			return $div
		},
		onFilterClick: function(evt, ui, $target) {
			var column = ui.column,
				self = this,
				that = self.that,
				$popup = self.$popup = this.appendFilter($(document.body), column, true);
			pq.makePopup($popup[0], $target[0], {
				onPopupRemove: function() {
					self.$popup = null;
					that.focusHead({
						ri: that.headerCells.length,
						colIndx: that.colModel.indexOf(column)
					})
				},
				keepPopupWithoutEle: true,
				closeOnEle: true
			});
			pq.position($popup, {
				my: "left top",
				at: "left bottom",
				of: $target
			});
			pq.focusEle(null, $popup);
			return false
		}
	})
})(jQuery);
(function($) {
	var cFilterMenu = pq.cFilterMenu = function(filterPanel) {
		this.filterPanel = filterPanel
	};
	cFilterMenu.select = function(that, column, filterPanel) {
		var self = this;
		self.that = that;
		self.filterPanel = filterPanel;
		self.di1 = "selected", self.grid = null;
		self.column = column
	};
	cFilterMenu.select.prototype = {
		change: function(applyFilter) {
			this.onChange(applyFilter).call(this.grid)
		},
		create: function($grid, filterUI, btnOk) {
			var self = this,
				that = self.that,
				obj = self.getGridObj(filterUI, btnOk),
				trigger = function(evtName) {
					var cb = filterUI[evtName];
					cb && cb.call(that, ui);
					that._trigger(evtName, null, ui)
				},
				ui = $.extend({
					obj: obj,
					column: self.column
				}, filterUI);
			trigger("selectGridObj");
			obj.rtl = that.options.rtl;
			if ($grid.hasClass("pq-grid")) {
				$grid.pqGrid("destroy")
			}
			ui.grid = self.grid = pq.grid($grid, obj);
			trigger("selectGridCreated");
			return self.grid
		},
		getCM: function(column, di1, groupIndx, labelIndx, maxCheck, filterUI) {
			var di = column.dataIndx,
				col = $.extend({
					filter: {
						crules: [{
							condition: "contain"
						}]
					},
					align: "left",
					format: filterUI.format || column.format,
					deFormat: column.deFormat,
					title: column.pq_title || column.title,
					dataType: column.dataType,
					dataIndx: di,
					editor: false,
					useLabel: true,
					renderLabel: this.getRenderLbl(labelIndx, di, this.that.options.strBlanks)
				}, groupIndx ? {} : {
					type: "checkbox",
					cbId: di1
				});
			return groupIndx ? [col, {
				dataIndx: di1,
				dataType: "bool",
				hidden: true
			}, {
				dataIndx: groupIndx,
				hidden: true
			}] : [col, {
				dataIndx: di1,
				dataType: "bool",
				hidden: true,
				cb: {
					header: !maxCheck,
					maxCheck: maxCheck
				}
			}]
		},
		getData: function(filterUI, filter) {
			var column = this.column,
				grid = this.that,
				valObj = {},
				di1 = this.di1,
				di = column.dataIndx,
				maxCheck = filterUI.maxCheck,
				value = pq.filter.getVal(filter)[0],
				options = pq.filter.getOptions(column, filterUI, grid, true);
			if (!$.isArray(value)) {
				if (maxCheck == 1) {
					value = [value]
				} else {
					value = []
				}
			} else if (maxCheck) {
				value = value.slice(0, maxCheck)
			}
			value.forEach(function(val) {
				valObj[val] = true
			});
			if (value.length) {
				options.forEach(function(rd) {
					rd[di1] = valObj[rd[di]]
				})
			} else {
				options.forEach(function(rd) {
					rd[di1] = !maxCheck
				})
			}
			return options
		},
		getGridObj: function(filterUI, btnOk) {
			var self = this,
				column = self.column,
				options = self.that.options,
				filter = column.filter,
				gridOptions = "gridOptions",
				groupIndx = filterUI.groupIndx,
				maxCheck = filterUI.maxCheck,
				di1 = self.di1,
				data = self.getData(filterUI, filter),
				labelIndx = data && data.length && data[0].pq_label != null ? "pq_label" : filterUI.labelIndx;
			self.filterUI = filterUI;
			return $.extend({
				colModel: self.getCM(column, di1, groupIndx, labelIndx, maxCheck, filterUI),
				check: self.onChange(!btnOk),
				filterModel: column.dataType === "bool" ? {} : undefined,
				groupModel: groupIndx ? {
					on: true,
					dataIndx: groupIndx ? [groupIndx] : [],
					titleInFirstCol: true,
					fixCols: false,
					indent: 18,
					checkbox: true,
					select: false,
					checkboxHead: !maxCheck,
					cascade: !maxCheck,
					maxCheck: maxCheck,
					cbId: di1
				} : {},
				dataModel: {
					data: data
				}
			}, options.menuUI[gridOptions], options.filterModel[gridOptions], filterUI[gridOptions], self.filterPanel ? {
				numberCell: {
					show: false
				},
				height: "flex",
				maxHeight: 250,
				columnTemplate: {
					filter: {
						attr: 'placeholder="Search.."'
					}
				}
			} : {})
		},
		getRenderLbl: function(labelIndx, di, strBlanks) {
			if (labelIndx === di) labelIndx = undefined;
			return function(ui) {
				var rd = ui.rowData,
					val = rd[labelIndx];
				return !val && rd[di] === "" ? strBlanks : val
			}
		},
		onChange: function(applyFilter) {
			var self = this,
				filterUI = self.filterUI,
				maxCheck = filterUI.maxCheck,
				cond = filterUI.condition;
			return function() {
				if (applyFilter) {
					var filtered = false,
						column = self.column,
						di = column.dataIndx,
						di1 = self.di1,
						grid = self.that,
						value = this.getData().filter(function(rd) {
							var selected = rd[di1];
							if (!selected) {
								filtered = true
							}
							return selected
						}).map(function(rd) {
							return rd[di]
						});
					if (filtered) {
						grid.filter({
							oper: "add",
							rule: {
								dataIndx: di,
								condition: cond,
								value: value
							}
						})
					} else {
						grid.filter({
							rule: {
								dataIndx: di,
								condition: cond,
								value: []
							}
						})
					}
					self.refreshRowFilter()
				}
			}
		},
		refreshRowFilter: function() {
			this.that.iRenderHead.postRenderCell(this.column)
		}
	};
	cFilterMenu.prototype = {
		addEvents: function() {
			var self = this;
			self.$sel0.on("change", self.onSel1Change.bind(self));
			self.$sel1.on("change", self.onSel2Change.bind(self));
			self.$filter_mode.on("change", self.onModeChange.bind(self));
			self.$clear.button().on("click", self.clear.bind(self));
			self.$ok.button().on("click", self.ok.bind(self))
		},
		addEventsInput: function() {
			var self = this;
			if (self.$inp) {
				self.$inp.filter("[type='checkbox']").off("click").on("click", self.onInput.bind(self));
				self.$inp.filter("[type='text']").off("change").on("change", self.onInput.bind(self))
			}
		},
		clear: function() {
			var grid = this.that,
				column = this.column,
				cond = this.cond0,
				type = this.getType(cond),
				di = column.dataIndx;
			grid.filter({
				rule: {
					dataIndx: di,
					condition: type ? cond : undefined
				},
				oper: "remove"
			});
			this.refreshRowFilter();
			this.ready()
		},
		close: function() {
			this.$popup.remove()
		},
		filterByCond: function(filter) {
			var self = this,
				grid = self.that,
				column = self.column,
				di = column.dataIndx,
				cond0 = self.cond0,
				remove = cond0 === "",
				cond1 = self.cond1,
				filterRow = self.filterRow;
			self.showHide(cond0, cond1);
			if (!filterRow) {
				var mode = self.getModeVal(),
					type = self.getType(cond0),
					arr0 = self.getVal(0),
					value = arr0[0],
					value2 = arr0[1],
					arr1 = self.getVal(1),
					value21 = arr1[0],
					value22 = arr1[1],
					$gridR = self.$gridR
			}
			if (type == "select") {
				filter && grid.filter({
					oper: "add",
					rule: {
						dataIndx: di,
						condition: cond0,
						value: []
					}
				});
				if (!filterRow) {
					self.iRange.create($gridR, self.filterUI[0], self.btnOk)
				}
			} else {
				filter && grid.filter({
					oper: remove ? "remove" : "add",
					rule: {
						dataIndx: di,
						mode: mode,
						crules: [{
							condition: cond0,
							value: value,
							value2: value2
						}, {
							condition: cond1,
							value: value21,
							value2: value22
						}]
					}
				})
			}
		},
		getBtnOk: function() {
			return this.$ok
		},
		getInp: function(indx) {
			return this["$inp" + indx]
		},
		getSel: function(indx) {
			return this["$sel" + indx]
		},
		getBtnClear: function() {
			return this.$clear
		},
		getHtmlInput: function(indx) {
			var o = this.that.options,
				showClearIcon = !o.filterModel.hideClearIcon,
				name = this.column.dataIndx,
				filterUI = this.filterUI[indx < 2 ? 0 : 1],
				chk = "checkbox",
				type = filterUI.type == chk ? chk : "text",
				cls = filterUI.cls || "",
				style = filterUI.style || "",
				attr = filterUI.attr || "",
				attrStr = `name='${name}' class='${cls}' style='width:100%;${style};display:none;' ${attr}`;
			if (showClearIcon && type == "text") {
				attrStr += ` is='clear-text' ctitle='${o.strClear}'`
			}
			return `<input type='${type}' ${attrStr} />`
		},
		getHtml: function() {
			var self = this,
				column = self.column,
				filter = column.filter,
				menuH = self.menuH,
				rules = filter.crules || [],
				rule0 = rules[0] || filter,
				rule1 = rules[1] || {},
				options = self.that.options,
				cond0 = self.cond0 = rule0.condition,
				cond1 = self.cond1 = rule1.condition,
				filterRow = self.filterRow;
			self.readFilterUI();
			var textFields = function(indx1, indx2) {
					return ["<div style='margin:0 auto 4px;'>", self.getHtmlInput(indx1), "</div>", "<div style='margin:0 auto 4px;'>", self.getHtmlInput(indx2), "</div>"].join("")
				},
				conds = pq.filter.getConditionsCol(this.column, self.filterUI[0]);
			return ["<div style='margin:8px auto;'>", " <select>", this.getOptionStr(conds, cond0), "</select></div>", filterRow ? "" : ["<div>", textFields(0, 1), "<div data-rel='grid' style='display:none;'></div>", menuH.singleFilter ? "" : ["<div class='filter_mode_div' style='text-align:center;display:none;margin:4px 0 4px;'>", "<label><input type='radio' name='pq_filter_mode' value='AND'/>", options.strAND, "</label>&nbsp;", "<label><input type='radio' name='pq_filter_mode' value='OR'/>", options.strOR, "</label>", "</div>", "<div style='margin:0 auto 4px;'><select>", this.getOptionStr(conds, cond1, true), "</select></div>", textFields(2, 3)].join(""), "</div>"].join(""), "<div style='margin:4px 0 0;'>", menuH.buttons.map(function(button) {
				return "<button data-rel='" + button + "' type='button' style='width:calc(50% - 4px);margin:2px;' >" + (options["str" + pq.cap1(button)] || button) + "</button>"
			}).join(""), "</div>"].join("")
		},
		getMode: function(indx) {
			var $fm = this.$filter_mode;
			return indx >= 0 ? $fm[indx] : $fm
		},
		getModeVal: function() {
			return this.$filter_mode.filter(":checked").val()
		},
		getOptionStr: function(conditions, _cond, excludeSelect) {
			var options = [""].concat(conditions),
				self = this,
				strs = self.that.options.strConditions || {},
				optionStr;
			if (excludeSelect) {
				options = options.filter(function(cond) {
					return self.getType(cond) != "select"
				})
			}
			optionStr = options.map(function(cond) {
				var selected = _cond == cond ? "selected" : "";
				return '<option value="' + cond + '" ' + selected + ">" + (strs[cond] || cond) + "</option>"
			}).join("");
			return optionStr
		},
		getType: function(condition) {
			return pq.filter.getType(condition, this.column)
		},
		getVal: function(indx) {
			var column = this.column,
				cond = this["cond" + indx],
				$inp0 = this["$inp" + (indx ? "2" : "0")],
				inp0 = $inp0[0],
				$inp1 = this["$inp" + (indx ? "3" : "1")],
				val0, val1, that = this.that,
				val = x => that.deformatCondition(x, column, cond);
			if ($inp0.is("[type='checkbox']")) {
				var indeterminate = inp0.indeterminate;
				val0 = inp0.checked ? true : indeterminate ? null : false
			} else {
				if ($inp0.is(":visible")) val0 = val($inp0.val());
				if ($inp1.is(":visible")) val1 = val($inp1.val())
			}
			return [val0, val1]
		},
		init: function(ui) {
			var column = this.column = ui.column;
			column.filter = column.filter || {};
			this.that = ui.grid;
			this.menuH = ui.menuH;
			this.$popup = ui.$popup;
			this.filterRow = ui.filterRow
		},
		initControls: function() {
			var filterUI = this.filterUI[0],
				that = this.that,
				cond0 = this.cond0,
				cond1 = this.cond1,
				editor = (i1, i2) => $([this["$inp" + i1][0], this["$inp" + i2][0]]).filter(":visible"),
				ui = {
					column: this.column,
					headMenu: true,
					indx: 0
				};
			this.showHide(cond0, cond1);
			ui.$editor = editor(0, 1);
			ui.condition = cond0;
			ui.type = filterUI.type;
			ui.filterUI = filterUI;
			filterUI.init.find(function(i) {
				return i.call(that, ui)
			});
			if (cond1) {
				filterUI = this.filterUI[1];
				ui.$editor = editor(2, 3);
				if (ui.$editor.length) {
					ui.condition = cond1;
					ui.type = filterUI.type;
					ui.filterUI = filterUI;
					ui.indx = 1;
					filterUI.init.find(function(i) {
						return i.call(that, ui)
					})
				}
			}
		},
		isInputHidden: function(type) {
			if (type == "select" || !type) {
				return true
			}
		},
		ok: function() {
			var cond = this.cond0;
			if (this.getType(cond) == "select" && !this.filterRow) {
				this.iRange.change(true)
			} else if (cond) {
				this.filterByCond(true)
			}
			this.close();
			this.refreshRowFilter()
		},
		onModeChange: function() {
			this.filterByCond(!this.btnOk)
		},
		onInput: function(evt) {
			var $inp = $(evt.target),
				filter = !this.btnOk;
			if ($inp.is(":checkbox")) {
				$inp.pqval({
					incr: true
				})
			}
			this.filterByCond(filter);
			if (filter) this.refreshRowFilter()
		},
		onSel1Change: function() {
			var self = this,
				filter = !self.btnOk,
				cfilter = self.column.filter,
				crules = cfilter.crules = cfilter.crules || [];
			crules[0] = crules[0] || {};
			crules[0].condition = self.cond0 = self.getSel(0).val();
			self.readFilterUI();
			if (!self.filterRow) {
				self.$inp0.replaceWith(this.getHtmlInput(0));
				self.$inp1.replaceWith(this.getHtmlInput(1));
				self.refreshInputVarsAndEvents();
				self.initControls()
			}
			self.filterByCond(filter);
			self.refreshRowFilter()
		},
		onSel2Change: function() {
			var self = this,
				crules = self.column.filter.crules;
			crules[1] = crules[1] || {};
			crules[1].condition = self.cond1 = self.getSel(1).val();
			self.readFilterUI();
			self.$inp2.replaceWith(self.getHtmlInput(2));
			self.$inp3.replaceWith(self.getHtmlInput(3));
			self.refreshInputVarsAndEvents();
			self.initControls();
			self.filterByCond(!self.btnOk)
		},
		ready: function(node) {
			this.node = node = node || this.node;
			var $node = $(node),
				self = this,
				that = self.that,
				column = self.column,
				filter = column.filter,
				rules = filter.crules || [],
				rule0 = rules[0] || filter,
				rule1 = rules[1] || {},
				cond0 = self.cond0 = rule0.condition,
				cond1 = self.cond1 = rule1.condition,
				type0, type1, $sel, filterUI = self.readFilterUI();
			self.iRange = new pq.cFilterMenu.select(that, column, self.filterPanel);
			type0 = self.getType(cond0);
			type1 = self.getType(cond1);
			$sel = self.$select = $node.find("select");
			self.$sel0 = $($sel[0]).val(cond0);
			self.$sel1 = $($sel[1]).val(cond1);
			self.$filter_mode = $node.find('[name="pq_filter_mode"]');
			self.$clear = $node.find("[data-rel='clear']");
			self.$ok = $node.find("[data-rel='ok']");
			self.btnOk = self.$ok.length;
			if (!self.filterRow) {
				self.refreshInputVarsAndEvents();
				self.$gridR = $node.find("[data-rel='grid']");
				self.$filter_mode.filter("[value=" + filter.mode + "]").attr("checked", "checked");
				self.$filter_mode_div = $node.find(".filter_mode_div");
				self.showHide(cond0, cond1);
				if (type0 == "select") {
					self.iRange.create(self.$gridR, filterUI[0], self.btnOk)
				} else {
					self.readyInput(0, type0, rule0)
				}
				self.readyInput(1, type1, rule1);
				self.initControls()
			}
		},
		readyInput: function(indx, type, rule) {
			var column = this.column,
				cond = this["cond" + indx],
				$inp0 = this["$inp" + (indx ? "2" : "0")],
				$inp1 = this["$inp" + (indx ? "3" : "1")],
				that = this.that,
				val = x => that.format(x, "Filter", column);
			if ($inp0.is(":checkbox")) {
				$inp0.pqval({
					val: rule.value
				})
			}
			$inp0.val(val(rule.value));
			if (type == "textbox2") {
				$inp1.val(val(rule.value2))
			}
		},
		readFilterUI: function() {
			var fu = this.filterUI = [],
				grid = this.that,
				ui = {
					column: this.column,
					condition: this.cond0,
					indx: 0,
					headMenu: true
				};
			fu[0] = pq.filter.getFilterUI(ui, grid);
			ui.condition = this.cond1;
			ui.indx = 1;
			fu[1] = pq.filter.getFilterUI(ui, grid);
			return fu
		},
		refreshInputVarsAndEvents: function() {
			var self = this,
				column = self.column,
				$inp = self.$inp = $(this.node).find("input[name='" + column.dataIndx + "']:not(.pq-search-txt)"),
				inp0 = $inp[0],
				inp1 = $inp[1],
				inp2 = $inp[2],
				inp3 = $inp[3];
			self.$inp0 = $(inp0);
			self.$inp1 = $(inp1);
			self.$inp2 = $(inp2);
			self.$inp3 = $(inp3);
			self.addEventsInput()
		},
		refreshRowFilter: function() {
			this.that.refreshHeaderFilter({
				dataIndx: this.column.dataIndx
			})
		},
		SelectGrid: function() {
			return this.$gridR.pqGrid("instance")
		},
		showHide: function(condition, condition2) {
			if (this.filterRow) {
				return
			}
			var self = this,
				$mode = self.$filter_mode_div,
				$sel1 = self.$sel1,
				type = self.getType(condition),
				type2, $inp = self.$inp;
			if (type === "select") {
				self.$gridR.show();
				$inp.hide();
				$mode.hide();
				$sel1.hide()
			} else {
				self.$gridR.hide();
				if (condition) {
					self.$inp0[self.isInputHidden(type) ? "hide" : "show"]();
					self.$inp1[type === "textbox2" ? "show" : "hide"]();
					$mode.show();
					$sel1.show();
					if (condition2) {
						type2 = self.getType(condition2);
						self.$inp2[self.isInputHidden(type2) ? "hide" : "show"]();
						self.$inp3[type2 === "textbox2" ? "show" : "hide"]()
					} else {
						self.$inp2.hide();
						self.$inp3.hide()
					}
				} else {
					$inp.hide();
					$mode.hide();
					$sel1.hide()
				}
			}
		},
		updateConditions: function() {
			var filter = this.column.filter;
			filter.crules = filter.crules || [{}];
			filter.crules[0].condition = this.cond0;
			if (this.cond1) {
				filter.crules[1] = filter.crules[1] || {};
				filter.crules[1].condition = this.cond1
			}
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery;
	$(document).on("pqGrid:bootup", function(evt, ui) {
		new _pq.cEditor(ui.instance)
	});
	_pq.cEditor = function cEditor(that) {
		var self = this,
			fixPos = self.setDims.bind(self);
		self.that = that;
		that.on("editorBeginDone", function(evt, ui) {
			ui.$td.addClass("pq-edited");
			self.ui = ui;
			self.setStyle(ui);
			self.setDims();
			var edInit = ui.editor.init;
			if (edInit) that.callFn(edInit, ui);
			if (ui.editor.appendTo != "grid") that.on("assignTblDims scroll", fixPos)
		}).on("editorEnd", function(evt, ui) {
			ui.$td.removeClass("pq-edited");
			that.off("assignTblDims scroll", fixPos);
			delete self.ui
		})
	};
	_pq.cEditor.prototype = {
		setStyle: function(ui) {
			var $td = ui.$td,
				$child = $td.children("div"),
				bg = $td.css("background-color"),
				style = {
					fontSize: $td.css("font-size"),
					fontFamily: $td.css("font-family"),
					backgroundColor: bg,
					color: $td.css("color")
				};
			style.padding = parseInt($child.css("padding-top")) + 0 + "px" + " " + (parseInt($child.css("padding-right")) + 0) + "px";
			ui.$editor.css(style)
		},
		setDims: function() {
			var self = this,
				ui = self.ui,
				that = self.that,
				ri = ui.rowIndxPage,
				ci = ui.colIndx,
				$td = ui.$td,
				td = $td[0],
				RB = that.iRenderB,
				htContTop = RB.htContTop,
				wdContLeft = RB.wdContLeft,
				cright = RB.$cright[0],
				cont = RB.getCellCont(ri, ci)[0],
				region = RB.getCellRegion(ri, ci),
				topOffset = 0,
				leftOffset = 0;
			if (region == "right") {
				topOffset = htContTop;
				leftOffset = wdContLeft
			}
			if (region == "left") topOffset = htContTop;
			if (region == "tr") leftOffset = wdContLeft;
			var $editor = ui.$editor,
				editorType = $editor[0].type,
				isTextArea = editorType == "textarea",
				isContentEdit = $editor[0].contentEditable == "true",
				$eo = ui.$cell,
				arr = RB.getCellCoords(ri, ci),
				o = that.options,
				rtl = o.rtl,
				left = rtl ? "right" : "left",
				posTD = $td.offset(),
				widthTD = td.offsetWidth,
				heightTD = td.offsetHeight,
				leftTD = posTD.left,
				topTD = posTD.top,
				rightTD = leftTD + widthTD,
				column = ui.column,
				EM = $.extend({}, o.editModel, column.editModel),
				$parent = $eo.parent(),
				posG = $parent.offset(),
				leftG = posG.left,
				topG = posG.top,
				parent = $parent[0],
				gridWidth = parent.offsetWidth,
				rightG = leftG + gridWidth,
				leftE = rtl ? rightG - rightTD : leftTD - leftG,
				leftE = leftE > leftOffset ? leftE : leftOffset,
				topE = topE,
				minWidth = widthTD - 2,
				minHeight = heightTD - 2,
				objO, style = {
					minWidth: minWidth
				};
			if (parent == that.element[0]) {
				topE = topTD - topG;
				objO = {
					top: topE
				};
				objO[left] = leftE;
				$eo.css(objO)
			} else {
				var arr = RB.getCellCoords(ri, ci),
					x1 = arr[0],
					y1 = arr[1];
				topE = y1 + 1 - cont.scrollTop;
				leftE = x1 + 1 - (rtl ? -1 : 1) * cont.scrollLeft;
				var maxHeight = cright.clientHeight - topE,
					maxWidth = cright.clientWidth - leftE;
				style.maxHeight = maxHeight;
				style.maxWidth = maxWidth;
				objO = {
					top: topE
				};
				objO[left] = leftE;
				$eo.css(objO)
			}
			minWidth = minWidth > maxWidth ? maxWidth : minWidth, minHeight = minHeight > maxHeight ? maxHeight : minHeight, style.minHeight = minHeight;
			style.width = minWidth;
			if (isTextArea) {
				if ($editor.attr("rows")) style.maxHeight = style.minHeight = undefined;
				if ($editor.attr("columns")) style.maxWidth = style.minWidth = style.width = undefined
			}
			$editor.css($.extend(style, pq.styleObj(ui.editor.style)));
			isContentEdit && $editor.pqContent(EM.saveKey != $.ui.keyCode.ENTER)
		}
	}
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		oldpqGrid = pq.grid,
		cProxy = _pq.cProxy = function(that) {
			this.that = that;
			that.options.reactive && this.init()
		};
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iProxy = new cProxy(grid)
	});
	pq.isEqual = function(val1, val2) {
		if (pq.isObject(val1)) {
			for (var key in val1) {
				if (!pq.isEqual(val1[key], val2[key])) return false
			}
			return true
		} else {
			return val1 === val2
		}
	};
	pq.grid = function(selector, options) {
		var grid = oldpqGrid.apply(pq, arguments),
			iProxy = grid.iProxy,
			goptions = grid.options;
		if (goptions.reactive) {
			grid.on("filter", function() {
				if (options.dataModel) {
					options.dataModel.data = goptions.dataModel.data
				}
				iProxy.prxData()
			});
			iProxy.prxObj(options, iProxy.onOption, true)
		}
		return grid
	};
	cProxy.prototype = {
		init: function() {
			var self = this,
				that = self.that;
			self.prxData();
			self.prxCM();
			that.on("refresh", self.clear.bind(self)).on("dataReady", self.clearV.bind(self)).on("dataAvailable", self.clearDV.bind(self))
		},
		onOption: function(key, val) {
			var self = this,
				key2, grid = self.that,
				obj = {},
				dataModel = "dataModel",
				goptions = grid.options;
			obj[key] = val;
			if (grid.element && !pq.isEqual(obj, goptions)) {
				self.refresh();
				if (pq.isObject(goptions[key])) {
					if (key == "groupModel") {
						grid.Group().option(val, false);
						self.refreshView()
					} else if (key == "treeModel") {
						grid.Tree().option(val)
					} else if (key == "sortModel") {
						grid.sort(val)
					} else {
						if (key == dataModel) {
							if (val.data) {
								self.prxData(val.data)
							}
							self.refreshDataView()
						} else if (key == "pageModel") {
							if (val.rPP || val.type != null) self.refreshDataView()
						}
						for (key2 in val) {
							grid.option(key + "." + key2, val[key2])
						}
					}
				} else {
					if (key == "colModel") {
						self.prxCM(val)
					} else if (key == "mergeCells") {
						self.refreshView()
					}
					grid.option(key, val)
				}
			}
		},
		onCMChange: function() {
			var self = this,
				that = self.that;
			clearTimeout(self.CMtimer);
			self.CMtimer = setTimeout(function() {
				that.refreshCM();
				self.refresh()
			});
			that.one("CMInit", function() {
				clearTimeout(self.CMtimer)
			})
		},
		prxCM: function(_CM) {
			var self = this,
				that = self.that,
				CM = _CM || that.options.colModel;
			if (CM) {
				self.prxArray(CM, self.onCMChange.bind(self));
				CM.forEach(function(col) {
					if (col.colModel) {
						self.prxCM(col.colModel)
					}
				})
			}
		},
		prxData: function(_data) {
			var self = this,
				that = self.that,
				data = _data || that.options.dataModel.data;
			if (data) {
				self.prxArray(data, function() {
					clearTimeout(self.datatimer);
					self.datatimer = setTimeout(function() {
						self.refreshView()
					});
					that.one("dataReady", function() {
						clearTimeout(self.datatimer)
					})
				})
			}
		},
		prxArray: function(data, cb) {
			var self = this,
				proto = Array.prototype,
				keys = "pop push reverse shift sort splice unshift".split(" ");
			keys.forEach(function(key) {
				data[key] = function() {
					var args = arguments,
						isSplice = key == "splice",
						ret = Object.getPrototypeOf(data)[key].apply(this, args);
					if (key == "push" || isSplice || key == "unshift") {
						self.prxArrayObjs(isSplice ? proto.slice.call(args, 2) : args)
					}
					cb.call(self);
					return ret
				}
			});
			self.prxArrayObjs(data)
		},
		prxArrayObjs: function(data) {
			var self = this,
				i = 0,
				len = data.length;
			for (; i < len; i++) {
				self.prxObj(data[i])
			}
		},
		prxObj: function(rd, cb, deep, model) {
			if (!pq.isObject(rd) || model == "tabModel") {
				return
			}
			var obj, key, self = this,
				pq_proxy = "pq_proxy";
			if (!rd[pq_proxy]) {
				Object.defineProperty(rd, pq_proxy, {
					value: {},
					enumerable: false
				})
			}
			obj = rd[pq_proxy];
			obj.__self = self;
			for (key in rd) {
				if (key.substr(0, 3) != "pq_") {
					if (deep && !model && pq.isObject(rd[key])) {
						self.prxObj(rd[key], cb, deep, key)
					}
					if (!obj.hasOwnProperty(key)) {
						Object.defineProperty(obj, key, Object.getOwnPropertyDescriptor(rd, key));
						self.defineProp(rd, obj, key, cb, deep, model)
					}
				}
			}
		},
		defineProp: function(rd, obj, key, cb, deep, model) {
			Object.defineProperty(rd, key, {
				get: function() {
					return obj[key]
				},
				set: function(val) {
					var self = obj.__self,
						tmpObj;
					if (deep && !model && pq.isObject(val)) {
						self.prxObj(val, cb, deep, key)
					}
					obj[key] = val;
					if (cb) {
						tmpObj = val;
						if (model) {
							tmpObj = {};
							tmpObj[key] = val
						}
						cb.call(self, model || key, tmpObj)
					} else {
						self.refresh()
					}
				},
				enumerable: true
			})
		},
		clear: function() {
			clearTimeout(this.timer)
		},
		clearV: function() {
			this.clear();
			clearTimeout(this.timerV)
		},
		clearDV: function() {
			this.clearV();
			clearTimeout(this.timerDV)
		},
		X: function(x, tid) {
			var self = this;
			self[tid] = setTimeout(function() {
				self.that.element && self.that[x]()
			})
		},
		refresh: function() {
			this.clear();
			this.X("refresh", "timer")
		},
		refreshView: function() {
			this.clearV();
			this.X("refreshView", "timerV")
		},
		refreshDataView: function() {
			this.clearDV();
			this.X("refreshDataAndView", "timerDV")
		}
	}
})(jQuery);
(function($) {
	$.widget("pq.drag", $.ui.mouse, {
		_create: function() {
			this._mouseInit()
		},
		_mouseCapture: function(evt) {
			this._trigger("capture", evt);
			return true
		},
		_mouseStart: function(evt) {
			this._trigger("start", evt);
			return true
		},
		_mouseDrag: function(evt) {
			this._trigger("drag", evt)
		},
		_mouseStop: function(evt) {
			this._trigger("stop", evt)
		}
	})
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iPic = new cPic(grid);
		grid.Pic = function() {
			return grid.iPic
		}
	});
	var _pq = $.paramquery,
		cPic = _pq.cPic = function(that) {
			var self = this,
				o = that.options,
				rtl = self.rtl = o.rtl;
			self.id = 0;
			self.left = rtl ? "right" : "left";
			self.pics = [];
			self.that = that;
			that.on("dataAvailable", function(evt, ui) {
				if (ui.source != "filter") {
					self.reset();
					that.one("refresh", function() {
						self.addPics(o.pics)
					})
				}
			}).on("assignTblDims", self.refresh.bind(self))
		};
	cPic.prototype = {
		addPics: function(pics) {
			var self = this;
			(pics || []).forEach(function(pic) {
				self.add(pic.name, pic.src, pic.from, pic.to, pic.cx, pic.cy, true)
			})
		},
		create: function($cont, src, left, top, width, height, pic, grp, id) {
			var self = this,
				obj, img = new Image,
				cssobj = {
					position: "absolute",
					top: top,
					zIndex: 5
				},
				$img = $(img),
				$div;
			img.src = src;
			cssobj[self.left] = left;
			$cont.append(img);
			$div = $img.attr({
				draggable: false,
				"pic-id": id,
				tabindex: 1
			}).css({
				height: height,
				width: width,
				cursor: "move"
			}).on("focus", function() {
				$(grp).css({
					outline: "2px dotted #999"
				})
			}).on("keydown", function(evt) {
				if (evt.keyCode == $.ui.keyCode.DELETE) self.remove(self.getId(this))
			}).on("blur", function() {
				$(grp).css({
					outline: ""
				})
			}).resizable({
				resize: self.onResize(self, grp, pic)
			}).parent(".ui-wrapper").css(cssobj);
			$div.find(".ui-resizable-se").removeClass("ui-icon");
			obj = self.drag($div, grp, pic);
			$img.drag({
				distance: 3,
				capture: function() {
					$img.focus()
				},
				start: obj.start,
				drag: obj.drag,
				stop: obj.stop
			});
			grp.push($div[0])
		},
		drag: function($div, grp, pic) {
			var self = this,
				that = self.that,
				iR = that.iRenderB,
				cx, cy, leftArr = iR.leftArr,
				topArr = iR.topArr,
				leftMost = leftArr[leftArr.length - 1],
				topMost = topArr[topArr.length - 1],
				numColWd = iR.numColWd,
				p = function(str) {
					return parseInt($div.css(str))
				},
				drag;
			return {
				start: function(evt) {
					cx = pic.cx, cy = pic.cy, drag = {
						pageX: evt.pageX,
						pageY: evt.pageY,
						scrollX: that.scrollX(),
						scrollY: that.scrollY()
					}
				},
				drag: function(evt) {
					var scrollX = that.scrollX(),
						scrollY = that.scrollY(),
						dx = (evt.pageX + scrollX - drag.pageX - drag.scrollX) * (self.rtl ? -1 : 1),
						dy = evt.pageY + scrollY - drag.pageY - drag.scrollY,
						left = p(self.left),
						top = p("top"),
						cssobj = {};
					drag.pageX = evt.pageX;
					drag.scrollX = scrollX;
					drag.pageY = evt.pageY;
					drag.scrollY = scrollY;
					if (left + dx - numColWd < 0) dx = numColWd - left;
					else if (left + dx + cx > leftMost + numColWd) dx = leftMost + numColWd - left - cx;
					if (top + dy < 0) dy = 0 - top;
					else if (top + dx + cy > topMost) dy = topMost - top - cy;
					cssobj.top = top + dy;
					cssobj[self.left] = left + dx;
					$(grp).css(cssobj)
				},
				stop: function() {
					var left = p(self.left) - numColWd,
						top = p("top"),
						c1 = self.findIndx(leftArr, left),
						r1 = self.findIndx(topArr, top);
					pic.from = [c1, left - leftArr[c1], r1, top - topArr[r1]]
				}
			}
		},
		onResize: function(self, grp, pic) {
			return function(evt, ui) {
				var ht = ui.size.height,
					wd = ui.size.width,
					obj = {
						height: ht,
						width: wd
					};
				$(grp).css(obj);
				$(grp).find("img").css(obj);
				delete pic.to;
				pic.cx = wd;
				pic.cy = ht
			}
		},
		getPos: function(from) {
			if (from) {
				var iR = this.that.iRenderB,
					r1 = from[2] * 1,
					c1 = from[0] * 1,
					tmp = iR.getCellXY(r1, c1),
					left = tmp[0] + from[1],
					top = tmp[1] + from[3];
				return [left, top]
			} else {
				return []
			}
		},
		name: function(str) {
			return str.replace(/[^0-9,a-z,A-Z,_\.]/g, "_")
		},
		refresh: function() {
			var self = this,
				$grid = self.that.widget();
			self.pics.forEach(function(pic) {
				var from = pic.from,
					r1 = from[2],
					c1 = from[0];
				if (r1 != null && c1 != null) {
					var id = pic.id,
						arr = self.getPos(from),
						left = arr[0],
						top = arr[1],
						obj = {
							top: top
						},
						$div = $grid.find("[pic-id=" + id + "]").parent();
					obj[self.left] = left;
					$div.css(obj)
				}
			})
		},
		createPicDOM: function(name, src, left, top, width, height, from, to, grp, id, ignore) {
			var self = this,
				that = self.that,
				iR = that.iRenderB,
				pic = {
					name: name,
					src: src,
					get from() {
						var from = this._from,
							col = from[0],
							rd = from[2];
						return [col ? that.getColIndx({
							column: col
						}) : null, from[1], (rd || {}).pq_ri, from[3]]
					},
					set from(arr) {
						this._from = [that.colModel[arr[0]], arr[1], that.getRowData({
							rowIndx: arr[2]
						}), arr[3]]
					},
					cx: width,
					cy: height,
					id: id
				};
			pic.from = from;
			["$cright", "$cleft", "$clt", "$ctr"].forEach(function($c) {
				self.create(iR[$c], src, left, top, width, height, pic, grp, id)
			});
			self.pics.push(pic);
			ignore || that.iHistory.push({
				callback: function(redo) {
					if (redo) id = self.add(name, src, from, to, width, height, true);
					else self.remove(id, true)
				}
			});
			that._trigger("picAdd")
		},
		add: function(name, src, from, to, cx, cy, ignore) {
			var self = this;
			if (!src) return;
			else if (src.substr(0, 5) != "data:") {
				name = name || src.split("/").pop();
				pq.urlToBase(src, function(src2) {
					self.add(name, src2, from, to, cx, cy, ignore)
				})
			} else {
				var arr = self.getPos(from),
					left = arr[0],
					top = arr[1],
					left2, top2, grp = [],
					id = self.id++,
					img, cb = function(width, height) {
						self.createPicDOM(name, src, left, top, width, height, from, to, grp, id, ignore)
					};
				if (to && to.length) {
					arr = self.getPos(to);
					left2 = arr[0];
					top2 = arr[1];
					cb(left2 - left, top2 - top)
				} else if (cy) {
					cb(cx, cy)
				} else {
					img = new Image;
					img.onload = function() {
						cb(img.width, img.height)
					};
					img.src = src
				}
			}
			return id
		},
		findIndx: function(arr, val) {
			return arr.findIndex(function(x) {
				return val < x
			}) - 1
		},
		getId: function(img) {
			return $(img).attr("pic-id")
		},
		remove: function(id, ignore) {
			var self = this,
				that = self.that,
				picR, indx = self.pics.findIndex(function(pic) {
					return pic.id == id
				});
			that.widget().find("[pic-id=" + id + "]").remove();
			picR = self.pics.splice(indx, 1)[0];
			ignore || that.iHistory.push({
				callback: function(redo) {
					if (redo) self.remove(id, true);
					else id = self.add(picR.name, picR.src, picR.from, picR.to, picR.cx, picR.cy, true)
				}
			})
		},
		reset: function() {
			this.that.widget().find("[pic-id]").remove();
			this.pics.length = 0;
			this.id = 0
		}
	}
})(jQuery);
(function($) {
	var _valFn = $.fn.val,
		_selectFn = $.fn.select;
	$.fn.val = function(val) {
		var ele = this[0],
			str, $p;
		if (ele && ele.contentEditable == "true") {
			if (arguments.length) {
				if (val != null) {
					ele.innerHTML = pq.escapeHtml(val + "").replace(/(\r\n|\r|\n)/g, "<br>");
					setCursorAtEnd(ele)
				}
				return this
			} else {
				str = ele.innerHTML;
				str = str.replace(/<br[^>]*>/g, "\n");
				$p = $("<p>").html(str);
				return $p.text()
			}
		} else {
			return _valFn.apply(this, arguments)
		}
	};
	$.fn.select = function() {
		var ele = this[0];
		if (ele && ele.contentEditable == "true") {
			var range = document.createRange(),
				sel = window.getSelection();
			range.selectNodeContents(this[0]);
			sel.removeAllRanges();
			sel.addRange(range)
		} else {
			_selectFn.call(this)
		}
	};
	var history, text, dataType, counter;

	function S() {
		return window.getSelection()
	}

	function R() {
		return document.createRange()
	}

	function setCursorAtEnd(ele) {
		var sel = S(),
			range = R(),
			child = ele.lastChild;
		if (child) {
			sel.removeAllRanges();
			range.setStartAfter(ele.lastChild);
			sel.addRange(range)
		}
	}

	function lineBreak(ele) {
		var childNodes = ele.childNodes,
			sel = S(),
			range = sel.getRangeAt(0),
			startC = range.startContainer,
			offset = range.startOffset,
			cb = function() {
				var node = document.createElement("br");
				range.insertNode(node);
				range.setStartAfter(node)
			};
		if (!childNodes.length || startC == ele && childNodes[offset - 1] && childNodes[offset - 1].nodeType == 3 || startC.nodeType == 3 && startC.textContent.length == offset && startC.nextSibling == null) {
			cb();
			cb()
		} else cb()
	}

	function getCaretIndx(ele) {
		var sel = S(),
			range = sel.getRangeAt(0),
			range2 = R();
		if (range.startContainer == ele) {
			return [range.startOffset, ele]
		} else {
			range2.selectNodeContents(ele);
			range2.setEnd(range.startContainer, range.startOffset);
			return [range2.toString().length]
		}
	}

	function setCaretIndx(ele, indx, root) {
		if (root == ele) {
			var range = R(),
				sel = S();
			range.setStart(ele, indx);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range)
		} else {
			$(ele.childNodes).toArray().forEach(function(node) {
				if (indx >= 0) {
					if (node.nodeName.toUpperCase() == "#TEXT") {
						var txt = node.textContent;
						if (txt.length >= indx) {
							var range = R(),
								sel = S();
							range.setStart(node, indx);
							range.collapse(true);
							sel.removeAllRanges();
							sel.addRange(range);
							indx = -1
						} else indx = indx - txt.length
					} else {
						indx = setCaretIndx(node, indx)
					}
				}
			});
			return indx
		}
	}

	function addHistory() {
		history[++counter] = {
			indx: getCaretIndx(text),
			dom: text.cloneNode(true)
		}
	}

	function saveHistoryIfChange() {
		if (isChanged(text)) {
			addHistory()
		} else {
			history[counter].dom = text.cloneNode(true);
			history[counter].indx = getCaretIndx(text)
		}
	}

	function isChanged(ele, _arr2) {
		if (history[counter]) {
			var arr = $(ele.childNodes).toArray(),
				arr2 = $(_arr2 || history[counter].dom.childNodes).toArray(),
				changed = false;
			if (arr.length != arr2.length) {
				return true
			}
			arr.forEach(function(node, indx) {
				if (!changed) {
					var node2 = arr2[indx];
					if (node.nodeName != node2.nodeName) {
						changed = true
					} else if (node.nodeType == 3 && node.nodeValue.split(/\s/).length != node2.nodeValue.split(/\s/).length) {
						changed = true
					} else if (node.childNodes && node.childNodes.length) {
						changed = isChanged(node, node2)
					}
				}
			});
			return changed
		}
	}

	function replaceChildren(nodes) {
		text.innerHTML = "";
		$(nodes).toArray().forEach(function(node) {
			text.appendChild(node.cloneNode(true))
		})
	}
	$.fn.pqContent = function(allowEnter) {
		var $ele = this,
			ele = text = $ele[0],
			cls = "pq-content";
		if ($ele.hasClass(cls)) {
			return
		}
		dataType = $ele.attr("dataType");
		history = [];
		counter = -1;
		$ele.addClass(cls).on("keydown", function(evt) {
			var undoRedo, histObj, preventDefault;
			if (!history.length) {
				addHistory()
			}
			if (evt.keyCode == 13 && (!dataType || dataType.indexOf("string") == 0 || dataType == "html")) {
				if (evt.altKey || allowEnter) {
					lineBreak(ele)
				}
				preventDefault = true
			} else if (evt.ctrlKey) {
				if (evt.keyCode == 90) {
					if (counter > 0) {
						counter--;
						undoRedo = 1
					}
					preventDefault = 1
				} else if (evt.keyCode == 89) {
					if (counter < history.length - 1) {
						counter++;
						undoRedo = 1
					}
					preventDefault = 1
				}
				if (undoRedo) {
					histObj = history[counter];
					replaceChildren(histObj.dom.childNodes);
					setCaretIndx(ele, histObj.indx[0], histObj.indx[1])
				}
			}
			if (!undoRedo) saveHistoryIfChange();
			if (preventDefault) return false
		})
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iRowResize = new cRowResize(grid);
		grid.RowResize = function() {
			return grid.iRowResize
		}
	});
	var _pq = $.paramquery,
		cRowResize = _pq.cRowResize = function(that) {
			var self = this;
			self.that = that;
			self.ht = 8;
			if (that.options.rowResize) {
				that.on(true, "cellMouseDown", self.onCellDown.bind(self)).on("cellMouseEnter", self.onCellEnter.bind(self))
			}
		};
	cRowResize.prototype = {
		isDetail: function(ui) {
			return ((ui.rowData || {}).pq_detail || {}).show
		},
		onCellDown: function(evt, ui) {
			if (ui.colIndx == -1 && !this.isDetail(ui)) {
				var self = this,
					y = evt.pageY,
					td = evt.currentTarget,
					$td = $(td),
					top = $td.offset().top,
					ht = td.offsetHeight,
					e;
				if (y >= top + ht - self.ht) {
					self.createDrag($td, ui);
					e = $.Event("mousedown", evt);
					e.type = "mousedown";
					$td.trigger(e);
					return false
				} else if ($td.draggable("instance")) {
					$td.draggable("destroy")
				}
			}
		},
		onCellEnter: function(evt, ui) {
			if (ui.colIndx == -1 && !this.isDetail(ui)) {
				var self = this,
					cls = "pq-row-resize",
					$td = $(evt.currentTarget);
				if (!self.drag && !$td.find("." + cls).length) {
					$td.append("<div class='" + cls + "' style='position:absolute;height:" + (self.ht - 1) + "px;bottom:0;left:0;width:100%;cursor:row-resize;'></div>")
				}
			}
		},
		createDrag: function($td, ui) {
			var self = this,
				that = self.that,
				rd = ui.rowData,
				rip = ui.rowIndxPage,
				iR = that.iRenderB,
				$cont = that.$cont,
				scaleY, top, startPos, style_common = "width:100%;background-color:#000;height:1px;position:absolute;";
			if (!$td.hasClass("ui-draggable")) {
				$td.on("dblclick", function() {
					delete rd.pq_htfix;
					iR.autoHeight({})
				}).draggable({
					axis: "y",
					cursor: "row-resize",
					cursorAt: {
						top: -2
					},
					start: function(evt) {
						self.drag = true;
						startPos = evt.pageY;
						top = iR.getTop(rip) - iR.scrollY();
						self.$top = $("<div style='" + style_common + "top:" + top + "px;'></div>").appendTo($cont);
						self.$helper = $("<div style='" + style_common + "'></div>").appendTo($cont);
						scaleY = that.getScale()[1]
					},
					helper: function() {
						return $("<span/>")
					},
					drag: function(evt) {
						var dy = (evt.pageY - startPos) / scaleY,
							bottom = top + $td[0].offsetHeight + dy;
						self.$helper.css("top", bottom)
					},
					stop: function(evt) {
						self.drag = false;
						var dy = (evt.pageY - startPos) / scaleY,
							arr = iR.rowhtArr;
						self.$top.remove();
						self.$helper.remove();
						if (arr) {
							rd.pq_ht = Math.max(arr[rip] + dy, 10);
							rd.pq_htfix = true;
							that.refresh()
						}
					}
				})
			}
		}
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance;
		grid.iTab = new cTab(grid);
		grid.Tab = function() {
			var args = arguments,
				iTab = grid.iTab,
				arg0 = args[0];
			if (arg0) {
				iTab.eachGrid(grid => {
					grid[arg0].apply(grid, Array.from(args).slice(1))
				});
				if (arg0 == "option") {
					iTab.model._options[args[1]] = args[2]
				}
			}
			return iTab
		}
	});
	var _pq = $.paramquery,
		cTab = _pq.cTab = function(that) {
			var self = this,
				activeId, o = that.options,
				model = o.tabModel || {},
				tabs = model.tabs;
			self.that = that;
			if (tabs) {
				if (!tabs.length) tabs.push({
					name: o.title,
					_inst: that
				});
				model.byRef = true;
				self.model = model;
				self._tbs = tabs;
				if (!model._main) {
					activeId = model.activeId;
					if (activeId == null) activeId = tabs.findIndex(function(tab) {
						return !tab.hidden
					});
					Object.defineProperty(model, "activeId", {
						get: function() {
							return this.tabs.indexOf(this._at)
						},
						set: function(val) {
							this._at = this.tabs[val]
						},
						configurable: true
					});
					model.activeId = activeId;
					model._main = model._at._inst = that;
					that.on("destroy", self.onDestroy.bind(self));
					self.getSheetOptions(model._at, true)
				}
				that.on("change", self.onChange.bind(self)).on("render", self.onRender.bind(self)).on("toggle", self.onToggle.bind(self))
			}
		};
	_pq.pqGrid.defaults.tabModel = {
		newTab: function() {
			return {
				sheet: {},
				extraRows: 20,
				extraCols: 10
			}
		}
	};
	cTab.prototype = {
		eachGrid(fn) {
			this._tbs.forEach(function(tab, indx) {
				var instance = tab._inst;
				if (instance) {
					fn(instance, indx)
				}
			})
		},
		activeId: function() {
			return this.model.activeId
		},
		activeTab: function() {
			return this.model._at
		},
		grid: function(tab) {
			return tab._inst
		},
		activate: function(id) {
			var self = this,
				model = self.model,
				tabs = self._tbs,
				tab = tabs[id],
				instance = tab._inst,
				activeId = model.activeId,
				$oldGrid = model._at._inst.widget();
			if (instance) {
				if (activeId != id) {
					$oldGrid.hide();
					instance.widget().show();
					model._at = tab;
					instance.iTab.refresh();
					instance.refresh()
				}
			} else {
				instance = self.create(id, true)
			}
			self.trigger("tabActivate", null, {
				tab: tab
			});
			return instance
		},
		add: function() {
			var self = this,
				tab = self.model.newTab.call(self.main());
			tab.name = tab.name || self.getTitle();
			self._tbs.push(tab);
			self.refresh()
		},
		clear: function() {
			var tabs = this._tbs,
				model = this.model;
			tabs.forEach(function(tab) {
				var i = tab._inst;
				if (i && i != model._main) i.widget().remove()
			});
			tabs.length = 0
		},
		create: function(id, isActive) {
			var tabs = this._tbs,
				model = this.model,
				tab = tabs[id],
				instance = tab._inst;
			if (instance) return instance;
			var $oldGrid = model._at._inst.widget(),
				options = this.getOptions(tab),
				$newGrid = $("<div/>").insertAfter($oldGrid);
			delete tab.sheet;
			$newGrid[0].style.cssText = $oldGrid[0].style.cssText;
			if (isActive) {
				model.activeId = id;
				$oldGrid.hide()
			} else $newGrid.hide();
			options.render = function() {
				tab._inst = this
			};
			return pq.grid($newGrid, options)
		},
		findActive: function(id) {
			var model = this.model,
				tabs = this._tbs,
				tab, i, found, activeTab = model._at;
			if (tabs.indexOf(activeTab) == -1 || activeTab.hidden) {
				for (i = id; i < tabs.length; i++) {
					tab = tabs[i];
					if (!tab.hidden) {
						found = i;
						break
					}
				}
				if (found == null) {
					for (i = id; i >= 0; i--) {
						tab = tabs[i];
						if (tab && !tab.hidden) {
							found = i;
							break
						}
					}
				}
				this.activate(found)
			} else this.refresh()
		},
		remove: function(id) {
			var self = this,
				model = self.model,
				tabs = self._tbs,
				tab = tabs[id],
				inst = tab._inst,
				activeId = model.activeId;
			if (self.show().length > 1) {
				tabs.splice(id, 1);
				self.findActive(activeId);
				if (inst && inst != model._main) inst.destroy()
			}
		},
		rename: function(id, val) {
			var self = this,
				tab = self._tbs[id],
				oldVal = tab.name;
			if (self.isValid(val)) {
				tab.name = val;
				self.trigger("tabRename", null, {
					tab: tab,
					oldVal: oldVal
				});
				self.refresh()
			}
		},
		edit: function(id) {
			var self = this,
				tab = self._tbs[id];
			$("<input class='pq-border-0' />").appendTo(self.getTab(id)).on("change", function(evt) {
				var val = $.trim(this.value);
				self.rename(id, val)
			}).on("focusout", function() {
				self.refresh()
			}).val(tab.name).focus().select()
		},
		getId: function(tab) {
			if ($.isPlainObject(tab)) {
				return this._tbs.indexOf(tab)
			}
			var id = $(tab).attr("tabId");
			return id != null ? id * 1 : null
		},
		getSheetOptions: function(tab, apply) {
			var that = this.that,
				iImport = that.iImport,
				sheet = tab.sheet,
				gridOptions, options = sheet ? iImport.importS(sheet, tab.extraRows, tab.extraCols) : {};
			if (apply && (sheet || (gridOptions = this.getGridOptions(tab)))) {
				$.extend(options, gridOptions);
				iImport.applyOptions(that, options)
			}
			return options
		},
		getGridOptions: function(tab) {
			var go = tab.gridOptions;
			if (pq.isFn(go)) go = go.call(this.main());
			return go
		},
		getOptions: function(tab) {
			var self = this,
				that = self.that,
				o = that.options,
				collapsible = "collapsible",
				CP = o[collapsible],
				options = $.extend(true, {}, self.model._options);
			$.extend(options, self.getSheetOptions(tab), self.getGridOptions(tab));
			["width", "height", "maxHeight", "maxWidth", "tabModel"].forEach(function(key) {
				options[key] = o[key]
			});
			$.extend(true, options[collapsible] = options[collapsible] || {}, {
				state: CP.state,
				toggle: CP.toggle,
				toggled: CP.toggled
			});
			return options
		},
		getTab: function(id) {
			return this.$tabs.find("[tabId=" + id + "]")[0]
		},
		getTitle: function() {
			var tabs = this._tbs,
				strTabName = this.that.options.strTabName || "{0}",
				titles = tabs.map(function(tab) {
					var m = (tab.name || "").match(new RegExp(strTabName.replace("{0}", "(\\d+)"), "i"));
					return m ? m[1] * 1 : 0
				}).sort(function(a, b) {
					return a - b
				});
			return strTabName.replace("{0}", titles.length ? titles.pop() + 1 : 1)
		},
		hide: function(arr) {
			return this.show(arr, true)
		},
		isValid: function(val) {
			if (val.length && val.length <= 31 && !this._tbs.find(function(tab) {
					return tab.name.toUpperCase() == val.toUpperCase()
				}) && !"/\\*?:[]".split("").find(function(char) {
					return val.indexOf(char) >= 0
				})) {
				return true
			}
		},
		main: function() {
			return this.model ? this.model._main : this.that
		},
		trigger: function(name, evt, ui) {
			this.eachGrid(function(grid) {
				grid._trigger(name, evt, ui)
			})
		},
		find: function(key, val) {
			return this._tbs.find(function(tab) {
				return tab[key] == val
			})
		},
		onChange: function(evt, ui) {
			ui.tab = this.find("_inst", this.that);
			this.trigger("tabChange", evt, ui)
		},
		onClick: function(evt) {
			var $target = $(evt.target),
				self = this,
				close = $target.hasClass("ui-icon-close"),
				strTabRemove = self.that.options.strTabRemove || "",
				id = self.getId($target.closest(".pq-tab-item")),
				tabName;
			if (id != null) {
				tabName = self._tbs[id].name;
				if (close && confirm(strTabRemove.replace("{0}", tabName)) != true) {
					return
				}
				self[close ? "remove" : "activate"](id)
			}
		},
		onDestroy: function() {
			this.clear()
		},
		onDblClick: function(evt) {
			var self = this,
				$tab = $(evt.target).closest(".pq-tab-item"),
				id = self.getId($tab);
			if (id != null && !self._tbs[id].noRename) {
				self.edit(id)
			}
		},
		onPlus: function() {
			this.add()
		},
		onLeft: function(right) {
			var $tabs = this.$tabs,
				tabs = $tabs[0],
				incr = tabs.clientWidth * .8,
				sl = pq.scrollLeft(tabs),
				sl = right == true ? sl + incr : Math.max(sl - incr, 0);
			$tabs.animate({
				scrollLeft: pq.scrollLeftVal(tabs, sl)
			}, 300)
		},
		onRight: function() {
			this.onLeft(true)
		},
		onRender: function() {
			var self = this,
				that = self.that,
				o = that.options,
				TM = o.tabModel,
				rtl = o.rtl,
				$tabs, clickOrKeyDown = "click keydown",
				iconW = "ui-icon-triangle-1-w",
				iconE = "ui-icon-triangle-1-e",
				model = self.model,
				scaleX, fnBind = function(method) {
					return function(evt) {
						if (evt.type == "click" || evt.keyCode == $.ui.keyCode.ENTER) self[method](evt)
					}
				},
				btn = function(cls, icon, attr) {
					return "<div tabindex=0 " + (attr || "") + " class='" + cls + " pq-tab-button pq-valign-center pq-bg-3 pq-border-0'><div class='" + icon + " ui-icon'></div></div>"
				},
				$cont = self.$cont = $("<div class='pq-tabs-cont ui-widget-content'>" + (TM.noAdd ? "" : btn("pq-tab-plus", "ui-icon-plus", "title='" + o.strTabAdd + "'")) + btn("pq-tab-w", rtl ? iconE : iconW) + "<div class='pq-tabs-strip' style='" + (TM.css || "") + "'></div>" + btn("pq-tab-e", rtl ? iconW : iconE) + "</div>").appendTo(TM.atTop ? that.$top : that.$bottom);
			if (!model._options) pq.copyObj(model._options = {}, that.origOptions, ["dataModel", "colModel", "tabModel"]);
			$cont.find(".pq-tab-plus").on(clickOrKeyDown, fnBind("onPlus"));
			self.$leftBtn = $cont.find(".pq-tab-w").on(clickOrKeyDown, fnBind("onLeft"));
			self.$rightBtn = $cont.find(".pq-tab-e").on(clickOrKeyDown, fnBind("onRight"));
			$tabs = self.$tabs = $cont.find(".pq-tabs-strip").on(clickOrKeyDown, fnBind("onClick"));
			if (!model.noSortable) {
				$tabs.sortable({
					axis: "x",
					distance: 3,
					start: function(evt) {
						scaleX = that.getScale()[0];
						$(".ui-sortable-placeholder").html("a")
					},
					update: self.onMove.bind(self),
					sort: function(evt, ui) {
						ui.helper.css({
							left: ui.position.left / scaleX
						})
					}
				})
			}
			$tabs.on("dblclick", self.onDblClick.bind(self)).on("scroll", self.onScroll.bind(self));
			self.refresh()
		},
		onMove: function(evt, ui) {
			var self = this,
				tabs = self._tbs,
				item = ui.item,
				id = self.getId(item),
				prevId = self.getId(item.prev()) || -1,
				tab = tabs.splice(id, 1)[0];
			tabs.splice(prevId + (prevId > id ? 0 : 1), 0, tab);
			self.refresh()
		},
		onScroll: function(evt) {
			this.model.scrollLeft = pq.scrollLeft(evt.target);
			this.setBtnEnable()
		},
		onToggle: function(evt, ui) {
			var self = this,
				tabs = self._tbs,
				model = self.model,
				that = self.that,
				CP = that.options.collapsible,
				toggled = ui.state == "max";
			if (!model.toggle) {
				that.one("refresh", function() {
					self.setBtn();
					self.setBtnEnable()
				});
				model.toggle = 1;
				tabs.forEach(function(tab) {
					var i = tab._inst;
					if (i && i.element[0] != that.element[0]) {
						var collapsible = i.options.collapsible;
						i.toggle({
							refresh: false
						});
						if (toggled) {
							collapsible.state = $.extend(true, {}, CP.state)
						}
						i.element.hide()
					}
				});
				model.toggle = 0
			}
		},
		refresh: function() {
			var self = this,
				arr = [],
				tabs = self._tbs,
				visible, that = self.that,
				model = self.model,
				strTabClose = that.options.strTabClose || "",
				activeTab = model._at,
				instance, activeId = model.activeId;
			if (activeTab && (instance = activeTab._inst) && that != instance) {
				return instance.Tab().refresh()
			}
			visible = self.show();
			tabs.forEach(function(tab, i) {
				if (!tab.hidden) {
					tab.name = tab.name || self.getTitle();
					arr.push("<div tabindex=0 class='pq-tab-item pq-valign-center pq-border-0 " + (i == activeId ? "pq-bg-3 pq-active" : "ui-state-default") + "' tabId='" + i + "'>" + "<div>" + pq.escapeHtml(tab.name) + "</div>" + (visible.length > 1 && !tab.noClose ? "<div title='" + strTabClose + "' class='ui-icon ui-icon-close'></div>" : "") + "</div>")
				}
			});
			self.$tabs.html(arr.join(""));
			self.setBtn();
			self.restoreSL();
			self.setBtnEnable()
		},
		setBtnEnable: function() {
			var self = this,
				target = self.$tabs[0],
				notAllow = {
					cursor: "default",
					opacity: .5
				},
				allow = {
					cursor: "",
					opacity: ""
				},
				max = target.scrollWidth - target.clientWidth,
				sl = pq.scrollLeft(target);
			self.$leftBtn.css(sl ? allow : notAllow);
			self.$rightBtn.css(sl >= max ? notAllow : allow)
		},
		setBtn: function() {
			var self = this,
				$strip = self.$tabs,
				strip = $strip[0],
				$leftBtn = self.$leftBtn,
				$rightBtn = self.$rightBtn;
			$leftBtn.hide();
			$rightBtn.hide();
			$strip.css("width", "calc(100% - 25px)");
			if (strip.scrollWidth - strip.clientWidth) {
				$leftBtn.show();
				$rightBtn.show();
				$strip.css("width", "calc(100% - 75px)")
			}
		},
		restoreSL: function() {
			var model = this.model,
				activeId = model.activeId,
				$tabs = this.$tabs,
				sl = model.scrollLeft;
			if (sl == null && activeId != null) {
				sl = $tabs.find("[tabid=" + activeId + "]")[0].offsetLeft;
				sl = sl - 50
			}
			pq.scrollLeft($tabs[0], sl)
		},
		show: function(arr, hide) {
			var tabs = this._tbs,
				arr2 = [];
			if (arr) {
				arr.forEach(function(id) {
					tabs[id].hidden = hide
				});
				this.findActive(this.model.activeId)
			} else {
				tabs.forEach(function(tab) {
					if (!tab.hidden == !hide) {
						arr2.push(tab)
					}
				});
				return arr2
			}
		},
		tabs: function() {
			return this._tbs
		}
	}
})(jQuery);
(function($) {
	$(document).on("pqGrid:bootup", function(evt, ui) {
		var grid = ui.instance,
			o = grid.options;
		if (o.dataModel.location == "lazy") {
			grid.iLazy = new Lazy(grid, o)
		}
	});
	var _pq = $.paramquery,
		Lazy = _pq.Lazy = function(grid, o) {
			var self = this;
			self.grid = grid;
			self.rpp = o.pageModel.rPP;
			grid.on("scrollEnd", self.onScroll.bind(self)).on("customSort", self.customSort.bind(self)).on("customFilter", self.customFilter.bind(self)).on("lazyProgress", self.progress.bind(self)).on("lazyComplete", self.onComplete.bind(self))
		};
	Lazy.prototype = {
		init: function(ui) {
			ui = ui || {};
			var self = this,
				grid = self.grid,
				obj = grid.getQueryString(ui);
			self.dataURL = obj.dataURL;
			self.url = obj.url;
			grid._trigger("lazyInit", null, ui);
			self.totalRecords = null;
			self.cachedPages = [];
			self.data = null;
			self.complete = false;
			self.xhr && self.xhr.abort();
			self.bars = [];
			self.request(ui)
		},
		customSort: function(evt, ui) {
			var self = this,
				grid = self.grid,
				SMtype = grid.option("sortModel.type");
			if (SMtype == "local" && !self.complete) {
				return false
			}
		},
		customFilter: function(evt, ui) {
			var self = this,
				complete = self.complete,
				grid = self.grid,
				FMtype = grid.option("filterModel.type");
			if (FMtype == "local" && !complete) {
				ui.dataTmp = grid.options.dataModel.data;
				ui.dataUF = [];
				ui.trigger = false;
				return false
			}
		},
		progBar: function() {
			var grid = this.grid,
				$bar, bar, bars = this.bars,
				DM = grid.options.dataModel,
				T = grid.iTab;
			if (DM.progressAcrossTabs) {
				grid = T.grid(T.activeTab())
			}
			$bar = grid.widget().find(".pq-grid-pbar");
			bar = $bar[0];
			if (bars.indexOf(bar) == -1) {
				bars.push(bar)
			}
			return $(bars)
		},
		progress: function(evt, ui) {
			var $pbar = this.progBar(),
				width = ui.percent + "%";
			$pbar.show().stop().animate({
				width: width
			}, {
				always: function() {
					$pbar.css({
						width: width
					})
				}
			})
		},
		onComplete: function(evt, ui) {
			var self = this,
				$pbar = self.progBar();
			$pbar.animate({
				width: "100%"
			}, {
				complete: function() {
					$pbar.css({
						width: 0
					}).hide()
				}
			});
			self.grid._onDataAvailable(ui)
		},
		onScroll: function() {
			if (!this.complete) this.request()
		},
		triggerProgress: function() {
			var percent = 0,
				pages = this.cachedPages;
			pages.forEach(function(page) {
				if (page) {
					percent++
				}
			});
			this.grid._trigger("lazyProgress", null, {
				percent: Math.round(percent * 100 / pages.length, 2)
			})
		},
		triggerComplete: function(ui) {
			var self = this,
				grid = self.grid;
			if (!self.complete) {
				self.complete = true;
				grid._trigger("lazyComplete", null, ui)
			}
		},
		request: function(ui) {
			ui = ui || {};
			var self = this,
				grid = self.grid,
				o = grid.options,
				PM = o.pageModel,
				obj = grid.getViewPortIndx(),
				initV = obj.initV,
				dataURL = self.dataURL,
				i = initV,
				data = self.data,
				rpp = self.rpp,
				cachedPages = self.cachedPages,
				upPage, downPage, viewPortPage, totalPages = self.totalPages,
				requestPage, finalV = obj.finalV;
			if (data && initV != null) {
				for (; i <= finalV; i++) {
					if (data[i] && data[i].pq_empty) {
						viewPortPage = requestPage = Math.floor(i / rpp) + 1;
						break
					}
				}
				if (!viewPortPage) {
					upPage = downPage = Math.floor(initV / rpp) + 1;
					for (i = 0; i <= totalPages; i++) {
						if (cachedPages[upPage] == false) {
							requestPage = upPage;
							break
						} else if (cachedPages[downPage] == false) {
							requestPage = downPage;
							break
						}
						upPage--;
						downPage++
					}
				}
			} else {
				requestPage = 1
			}
			if (!requestPage) {
				self.triggerComplete(ui);
				return false
			}
			PM.curPage = requestPage;
			self.xhr && self.xhr.abort();
			dataURL = $.extend(dataURL, {
				pq_curpage: requestPage,
				pq_rpp: PM.rPP
			});
			grid.callXHR(self.url, dataURL, function(response, textStatus, jqXHR) {
				var data = response.data,
					totalRecords = response.totalRecords,
					len = data.length,
					i = len,
					curPage = response.curPage,
					pq_data = self.data = self.data || [],
					refreshView, init = (curPage - 1) * self.rpp;
				if (self.totalRecords == null) {
					refreshView = true;
					for (; i < totalRecords; i++) {
						pq_data[i + init] = {
							pq_empty: true
						}
					}
					self.totalRecords = totalRecords;
					totalPages = self.totalPages = Math.ceil(totalRecords / rpp);
					for (i = 1; i <= totalPages; i++) {
						cachedPages[i] = false
					}
					grid.option("dataModel.data", pq_data)
				}
				cachedPages[curPage] = true;
				for (i = 0; i < len; i++) {
					pq_data[i + init] = data[i];
					pq_data[i + init].pq_empty = false
				}
				if (refreshView) {
					grid.refreshView({
						header: ui.header,
						trigger: false,
						triggerQueue: false,
						group: false
					})
				} else if (viewPortPage) grid.refresh({
					header: false
				});
				if (initV != null) {
					if (self.request(ui) != false) self.triggerProgress()
				} else self.triggerComplete(ui)
			})
		}
	}
})(jQuery);
(function($) {
	$.fn.pqColorPick = function(options) {
		options = options || {};
		var $ele = this,
			$doc = $(document.body),
			$colorInp, strings = $.paramquery.strings,
			title = options.title || "",
			strOk = strings.strApply,
			$sliders, $popup;
		$ele.on("click", function() {
			if (!$popup) {
				$popup = $(`<div class="pq-theme pq-color-picker">
                                <div class="pq-cp-title">${title}</div>
                                <div style="float:left;width:75%;">
                                       <div class="pq-cp-red pq-slider" ></div>
                                       <div class="pq-cp-green pq-slider"></div>
                                       <div class="pq-cp-blue pq-slider"></div>    
                                       <input type="text" class="pq-cp-input" />
                                       <button type="button">${strOk}</button>
                                </div>
                                <div class="pq-cp-output ui-widget-content"></div>
                                <div style="clear:both;">
                                </div>
                         </div>`).appendTo($doc);
				$colorInp = $E(".pq-cp-input").on("input", function() {
					var val = getColorVal();
					if (val) {
						slide(val)
					}
				});
				$popup.find("button").button().on("click", function() {
					var val = getColorVal();
					if (val) $ele.val(val).trigger("change");
					$popup.hide();
					$ele.focus()
				});
				pq.makePopup($popup[0], $ele[0], {
					onPopupRemove: onPopupRemove
				});
				position();
				$sliders = $E(".pq-slider").slider({
					max: 255,
					range: "min",
					animate: true,
					slide: onChange,
					change: onChange
				})
			} else if ($popup.is(":hidden")) {
				$popup.show();
				position()
			} else {
				$popup.hide()
			}
			if ($popup.is(":visible")) {
				pq.focusEle(false, $popup);
				slide($ele.val());
				onChange()
			}
			return false
		});

		function position() {
			pq.position($popup, {
				my: "left top",
				at: "left bottom",
				of: $ele
			})
		}

		function onPopupRemove() {
			$popup = $colorInp = $sliders = null
		}

		function slide(val) {
			toDec(val, 1, 2, 0);
			toDec(val, 3, 2, 1);
			toDec(val, 5, 2, 2)
		}

		function getColorVal() {
			var val = $colorInp.val().trim();
			if (val.match(/^#[0-9,A-F]{6}/i)) {
				return val
			}
		}

		function onChange() {
			var color = "#" + ["red", "green", "blue"].map(function(_color) {
				return toHex($E(".pq-cp-" + _color))
			}).join("");
			$E(".pq-cp-output").css("background-color", color);
			$colorInp.val(color)
		}

		function $E(sel) {
			return $popup.find(sel)
		}

		function toDec(val, start, len, indx) {
			val = parseInt(val.substr(start, len), 16);
			$($sliders[indx]).slider("value", val)
		}

		function toHex($ele) {
			var val = $ele.slider("value").toString(16);
			return val.length == 1 ? "0" + val : val
		}
		return $ele
	}
})(jQuery);
(function($) {
	$.fn.pqBorder = function(options) {
		options = options || {};
		var $ele = this,
			grid = options.grid || $ele.closest(".pq-grid").pqGrid("instance"),
			$doc = $(document.body),
			borders = options.borders || ["all", "outer", "inner", "vertical", "horizontal", "left", "right", "top", "bottom", "none"],
			strings = $.paramquery.strings,
			iconmap = {
				vertical: "middle",
				horizontal: "center"
			},
			buttons = borders.map(function(border, i) {
				var title = strings[pq.camelCase("str-" + border)],
					icon = "bi-border" + (border == "none" ? "" : "-" + (iconmap[border] || border));
				return "<div tabindex=0 data-border='" + border + "' class='pq-border-0 pq-bp-button " + icon + "' title = '" + title + "'>&nbsp;</div>" + (i == 4 ? "<br/>" : "")
			}).join(""),
			color, $color, $style, style, $popup, $popStyle;
		$ele.on("click", function() {
			color = $ele.data("color") || "#000000";
			style = $ele.data("style") || "1px solid";
			if (!$popup) {
				$popup = $(`<div class="pq-theme pq-border-picker">                                
                                <div style="float:left;width:75%;">${buttons}
                                </div>                 
                                <div style="float:right;width:22%;">
                                    <div tabindex=0 class="pq-border-0 pq-bp-button pq-bp-style" title = '${strings.strBorderStyle}'>
                                        <div style="border-bottom:${style};"></div>
                                        <span class='ui-icon-triangle-1-s' style=""></span>
                                    </div>
                                    <br/>
                                    <input type=color value='${color}' class='pq-bp-button' title = '${strings.strBorderColor}' />
                                </div>
                                <div style="clear:both;">
                                </div>
                         </div>`).appendTo($doc);
				$E(".pq-bp-button").on("pq:clickE", function(evt) {
					var border = $(evt.target).data("border");
					if (border) {
						grid.Selection().border(border, style, color);
						$popup.hide();
						setTimeout(function() {
							$ele.focus()
						})
					}
				});
				$color = $E("input").pqColorPick({
					title: strings.strBorderColor
				}).on("change", function() {
					color = $(this).val();
					$ele.data("color", color)
				});
				$style = $E(".pq-bp-style").on("pq:clickE", onStyleClick);
				pq.makePopup($popup[0], $ele[0], {
					onPopupRemove: onPopupRemove,
					noCloseSelector: ".pq-color-picker,.pq-bp-style-grid"
				});
				position()
			} else if ($popup.is(":hidden")) {
				$popup.show();
				position()
			} else {
				$popup.hide()
			}
			if ($popup.is(":visible")) {
				pq.focusEle(false, $popup)
			}
		});

		function position() {
			pq.position($popup, {
				my: "left top",
				at: "left bottom",
				of: $ele
			})
		}

		function onPopupRemove() {
			$popup = $popStyle = $color = $style = null
		}

		function onPopStyleRemove() {
			$popStyle = null
		}

		function $E(sel) {
			return $popup.find(sel)
		}

		function onStyleClick() {
			if (!$popStyle) {
				$popStyle = pq.Select({
					noBorderSelection: true,
					noBorderFocus: true,
					colModel: [{
						style: "padding-top:10px;",
						width: 120,
						render: function(ui) {
							return "<div style='border-bottom:" + ui.cellData + ";'></div>"
						}
					}, {
						width: 28,
						skipFocus: true,
						minWidth: 28,
						render: function(ui) {
							return ui.rowData[0] == style ? "<span class='ui-icon-check'></span>" : ""
						}
					}],
					dataModel: {
						data: [
							["1px solid"],
							["2px solid"],
							["3px solid"],
							["1px dotted"],
							["1px dashed"],
							["3px double"]
						]
					},
					cellClickE: function(evt, ui) {
						style = ui.rowData[0];
						$ele.data("style", style);
						$style.find("div").css("border-bottom", style);
						setTimeout(function() {
							$style.focus();
							$popStyle.remove();
							$popStyle = null
						})
					},
					create: function() {
						this.widget().addClass("pq-bp-style-grid")
					}
				}, $style, onPopStyleRemove)
			} else {
				$popStyle[$popStyle.is(":hidden") ? "show" : "hide"]()
			}
			if ($popStyle.is(":visible")) pq.focusEle(false, $popStyle)
		}
	}
})(jQuery);
(function($) {
	var cVirtual = pq.cVirtual = function() {
		this.diffH = 0;
		this.diffV = 0
	};
	cVirtual.setSBDim = function() {
		var $div = $("<div style='max-width:100px;height:100px;position:fixed;left:0;top:0;overflow:auto;visibility:hidden;'>" + "<div style='width:200px;height:100px;'></div></div>").appendTo(document.body),
			div = $div[0];
		this.SBDIM = div.offsetHeight - div.clientHeight;
		$div.remove()
	};
	cVirtual.prototype = {
		assignTblDims: function(left) {
			var tbl, self = this,
				isBody = self.isBody(),
				actual = true,
				ht = self.getTopSafe(this[left ? "cols" : "rows"], left, actual),
				maxHt = self.maxHt;
			if (ht > maxHt) {
				self[left ? "ratioH" : "ratioV"] = ht / maxHt;
				self[left ? "virtualWd" : "virtualHt"] = ht;
				ht = maxHt
			} else {
				ht = ht || (self.isHead() ? 0 : 1);
				self[left ? "ratioH" : "ratioV"] = 1
			}
			var tr = self.$tbl_right[0],
				$tl = self[left ? "$tbl_tr" : "$tbl_left"],
				tl = $tl.length ? $tl[0] : {
					style: {}
				},
				prop = left ? "width" : "height";
			tr.style[prop] = ht + "px";
			tl.style[prop] = ht + "px";
			if (isBody) tbl = "Tbl";
			else if (self.isHead()) tbl = "TblHead";
			else tbl = "TblSum";
			if (!isBody && left) self.$spacer.css(self.rtl, ht);
			self.dims[left ? "wd" + tbl : "ht" + tbl] = ht;
			isBody && self.triggerTblDims(100)
		},
		calInitFinal: function(top, bottom, left) {
			var _init, _final, rows = this[left ? "cols" : "rows"],
				frozen = this[left ? "freezeCols" : "freezeRows"],
				ri = frozen,
				topArr = this[left ? "leftArr" : "topArr"],
				found, offset = this.getTopSafe(ri, left);
			if (this.that.options[left ? "virtualX" : "virtualY"] == false) return [ri, rows - 1];
			if (ri == rows) return [0, ri - 1];
			if (left) offset -= this.numColWd;
			top += offset;
			bottom += offset;
			if (ri < rows && topArr[ri] < top) {
				var k = 30,
					j2 = rows,
					jm;
				while (k--) {
					jm = Math.floor((ri + j2) / 2);
					if (topArr[jm] >= top) {
						j2 = jm
					} else if (ri == jm) {
						found = true;
						break
					} else {
						ri = jm
					}
				}
				if (!found) {
					throw "ri not found"
				}
			}
			for (; ri <= rows; ri++) {
				if (topArr[ri] > top) {
					_init = ri && ri > frozen ? ri - 1 : ri;
					break
				}
			}
			for (; ri <= rows; ri++) {
				if (topArr[ri] > bottom) {
					_final = ri - 1;
					break
				}
			}
			if (_init == null && _final == null && rows && top > topArr[rows - 1]) {
				return [null, null]
			}
			if (_init == null) _init = 0;
			if (_final == null) _final = rows - 1;
			return [_init, _final]
		},
		calInitFinalSuper: function() {
			var self = this,
				dims = this.dims || {},
				arrTB = self.calcTopBottom(),
				top = arrTB[0],
				bottom = arrTB[1],
				fullRefresh = arrTB[2],
				arrLR = self.calcTopBottom(true),
				left = arrLR[0],
				right = arrLR[1],
				arrV = self.calInitFinal(top, bottom),
				r1 = arrV[0],
				r2 = arrV[1],
				arrH = self.calInitFinal(left, right, true),
				c1 = arrH[0],
				c2 = arrH[1];
			if (this.isBody()) {
				dims.bottom = bottom;
				dims.top = top;
				dims.left = left;
				dims.right = right
			}
			fullRefresh = fullRefresh || arrLR[2];
			return [r1, c1, r2, c2, fullRefresh]
		},
		calcTopBottom: function(left) {
			var self = this,
				isBody = self.isBody(),
				dims = self.dims,
				virtualWin = self.virtualWin,
				$cr = self.$cright,
				cr = $cr[0],
				diff, top, bottom;
			if (left) {
				var _stop = pq.scrollLeft(cr),
					stop = self.sleft,
					htCont = dims.wdCont,
					htContTop = self.wdContLeft,
					ratioV = self.ratioH
			} else {
				virtualWin && (diff = $(window).scrollTop() - $cr.offset().top);
				_stop = virtualWin ? self._calcTop(cr, diff) : cr.scrollTop;
				stop = self.stop;
				htCont = self.htCont;
				htContTop = self.htContTop;
				ratioV = self.ratioV
			}
			_stop = _stop < 0 ? 0 : _stop;
			if (ratioV == 1) {
				bottom = _stop + htCont - htContTop;
				bottom = left || !virtualWin ? bottom : self._calcBot(_stop, bottom, diff);
				if (!(bottom >= 0)) {
					bottom = 0
				}
				return [_stop, bottom]
			} else {
				var maxHt = cVirtual.maxHt,
					factorV, virtualHt = self[left ? "virtualWd" : "virtualHt"],
					htContClient = left ? dims.wdContClient : dims.htContClient,
					strDiff = left ? "diffH" : "diffV",
					diff = self[strDiff],
					_diff, fullRefresh, sbHeight = htCont - htContClient;
				if (_stop + htContClient >= maxHt) {
					bottom = virtualHt - htContTop + sbHeight;
					top = bottom - htCont + htContTop
				} else {
					if (_stop == 0) {
						top = 0
					} else {
						factorV = stop == null || Math.abs(_stop - stop) > htCont ? ratioV : 1;
						top = _stop * factorV + (factorV == 1 && diff ? diff : 0)
					}
					bottom = top + htCont - htContTop
				}
				_diff = top - _stop;
				if (_diff != diff) {
					fullRefresh = true;
					self[strDiff] = _diff;
					isBody && self.triggerTblDims(3e3)
				}
				self[left ? "sleft" : "stop"] = _stop;
				if (!(_stop >= 0)) {
					throw "stop NaN"
				}
				if (!(bottom >= 0) || !(top >= 0)) {
					throw "top bottom NaN"
				}
				return [top, bottom, fullRefresh]
			}
		},
		_calcTop: function(cr, diff) {
			return cr.scrollTop + (diff > 0 ? diff : 0)
		},
		_calcBot: function(top, bottom, diff) {
			var _bot = top + $(window).height() + (diff < 0 ? diff : 0);
			return _bot < bottom ? _bot : bottom
		},
		getHtDetail: function(rd, rowHtDetail) {
			var pq_detail = (rd || {}).pq_detail;
			return pq_detail && pq_detail.show ? pq_detail.height || rowHtDetail : 0
		},
		getTop: function(ri, actual) {
			var top = this.topArr[ri],
				diff = actual ? 0 : this.diffV;
			if (diff) {
				top = top - (ri > this.freezeRows ? diff : 0);
				if (top < 0) top = 0
			}
			if (top >= 0) return top;
			else throw "getTop ", top
		},
		getTopSafe: function(ri, left, actual) {
			var data_len = left ? this.cols : this.rows;
			return this[left ? "getLeft" : "getTop"](ri > data_len ? data_len : ri, actual)
		},
		getLeft: function(_ci, actual) {
			var offset = this.numColWd,
				arr = this.leftArr,
				maxCI = arr.length - 1,
				ci = _ci > maxCI ? maxCI : _ci,
				left = ci == -1 ? 0 : arr[ci] + offset,
				diff = actual ? 0 : this.diffH;
			if (diff) {
				left = left - (ci > this.freezeCols ? diff : 0);
				if (left < 0) left = 0
			}
			if (left >= 0) return left;
			else throw "getLeft ", left
		},
		getHeightR: function(ri, rows) {
			rows = rows || 1;
			var arr = this.topArr,
				ht = arr[ri + rows] - arr[ri];
			if (ht >= 0) {
				return ht
			} else {
				throw "getHeight ", ht
			}
		},
		getHeightCell: function(ri, rows) {
			rows = rows || 1;
			var arr = this.topArr,
				rowHtDetail = this.rowHtDetail,
				minus, len, ht;
			minus = rowHtDetail ? this.getHtDetail(this.data[ri + rows - 1], rowHtDetail) : 0;
			ht = arr[ri + rows] - arr[ri] - minus;
			if (ht >= 0) {
				return ht
			} else {
				throw "getHeight: ", ht
			}
		},
		getHeightCellM: function(rip, rows) {
			return this.getTopSafe(rip + rows) - this.getTop(rip)
		},
		getHeightCellDirty: function(rip, rows) {
			this.setTopArr(rip, null, rip + rows);
			return this.getHeightCellM(rip, rows)
		},
		getWidthCell: function(ci) {
			if (ci == -1) {
				return this.numColWd
			}
			var wd = this.colwdArr[ci];
			if (wd >= 0) {
				return wd
			} else {
				throw "getWidthCell: ", wd
			}
		},
		getWidthCellM: function(ci, cols) {
			return this.getTopSafe(ci + cols, true) - this.getLeft(ci)
		},
		initRowHtArr: function() {
			var rowht = this.rowHt,
				data = this.data,
				len = data.length,
				rowHtDetail = this.rowHtDetail,
				rd, rowhtArr = this.rowhtArr = new Uint16Array(len),
				topArr = this.topArr = new Uint32Array(len + 1),
				i = 0;
			if (rowHtDetail) {
				for (; i < len; i++) {
					rd = data[i];
					rowhtArr[i] = rd ? rd.pq_hidden ? 0 : rd.pq_ht || rowht + this.getHtDetail(rd, rowHtDetail) : rowht
				}
			} else {
				for (; i < len; i++) {
					rd = data[i];
					rowhtArr[i] = rd ? rd.pq_hidden ? 0 : rd.pq_ht || rowht : rowht
				}
			}
		},
		initRowHtArrDetailSuper: function(arr) {
			var rowhtArr = this.rowhtArr,
				rip, data = this.data;
			arr.forEach(function(item) {
				rip = item[0];
				rowhtArr[rip] = data[rip].pq_ht = rowhtArr[rip] + item[1]
			});
			this.setTopArr();
			this.assignTblDims()
		},
		initRowHtArrSuper: function() {
			this.initRowHtArr();
			this.setTopArr();
			this.assignTblDims()
		},
		refreshRowHtArr: function(ri, full) {
			var rd = this.data[ri],
				rowHtDetail = this.rowHtDetail,
				rowht = this.rowHt;
			this.rowhtArr[ri] = rd.pq_hidden ? 0 : rowht + this.getHtDetail(rd, rowHtDetail);
			if (full) {
				this.setTopArr(ri);
				this.assignTblDims()
			}
		},
		setTopArr: function(r1, left, r2) {
			var i = r1 || 0,
				top, self = this,
				len, final, rowhtArr, topArr;
			if (left) {
				len = self.cols;
				rowhtArr = self.colwdArr;
				topArr = self.leftArr
			} else {
				len = self.rows;
				rowhtArr = self.rowhtArr;
				topArr = self.topArr
			}
			final = r2 && r2 < len ? r2 : len - 1;
			top = i ? topArr[i] : 0;
			for (; i <= final; i++) {
				topArr[i] = top;
				top += rowhtArr[i]
			}
			topArr[i] = top
		},
		triggerTblDims: function(t) {
			var self = this;
			self.setTimer(function() {
				self.that._trigger("assignTblDims")
			}, "assignTblDims", t)
		}
	}
})(jQuery);
(function($) {
	$(document).one("pq:ready", function() {
		var cVirtual = pq.cVirtual;
		cVirtual.maxHt = 5e6;
		cVirtual.setSBDim();
		$(window).on("resize", cVirtual.setSBDim.bind(cVirtual))
	})
})(jQuery);
(function($) {
	pq.cRender = function() {
		this.data = []
	};
	pq.cRender.prototype = $.extend({}, {
		_m: function() {},
		autoHeight: function(ui) {
			var self = this,
				that = self.that,
				isBody = self.isBody(),
				hChanged = ui.hChanged,
				fr = self.freezeRows,
				changed = false,
				initV = self.initV,
				finalV = self.finalV;
			if (self.rows) {
				isBody && that._trigger("beforeAutoRowHeight");
				changed = self.setRowHtArr(initV, finalV, hChanged);
				changed = self.setRowHtArr(0, fr - 1, hChanged) || changed;
				if (changed) {
					self.setTopArr(fr ? 0 : initV);
					self.assignTblDims();
					self.setPanes();
					self.setCellDims(true);
					if (isBody) {
						ui.source = "autoRow";
						self.refresh(ui);
						that._trigger("autoRowHeight")
					}
				} else {
					self.setCellDims(true)
				}
			}
		},
		autoWidth: function(ui) {
			ui = ui || {};
			var self = this,
				fc = self.freezeCols,
				colIndx = ui.colIndx,
				fn = function(ci) {
					if (colIndx.indexOf(ci) >= 0) self.setColWdArr(ci, ci)
				},
				initH = self.initH,
				finalH = self.finalH,
				ci = finalH;
			if (colIndx) {
				for (; ci >= initH; ci--) {
					fn(ci)
				}
				for (ci = fc - 1; ci >= 0; ci--) {
					fn(ci)
				}
			} else {
				self.setColWdArr(initH, finalH);
				self.setColWdArr(0, fc - 1)
			}
		},
		_each: function(cb, init, final, data, hidden, freeze) {
			var self = this,
				jump = self.jump,
				rip = 0,
				rd;
			for (; rip <= final; rip++) {
				rip = jump(init, freeze, rip);
				rd = data[rip] || {};
				if (!rd[hidden]) cb.call(self, rd, rip)
			}
		},
		eachV: function(cb) {
			var self = this;
			self._each(cb, self.initV, self.finalV, self.data, "pq_hidden", self.freezeRows)
		},
		eachH: function(cb) {
			var self = this;
			self._each(cb, self.initH, self.finalH, self.colModel, "hidden", self.freezeCols)
		},
		saveValues: function(refreshCompareBy) {
			var arr = [],
				self = this,
				val, byVal = refreshCompareBy == "value";
			self.eachV(function(rd, ri) {
				arr[ri] = [];
				self.eachH(function(col, ci) {
					val = byVal ? rd[col.dataIndx] : self.generateCell(ri, ci, rd, col, self.getCellRegion(ri, ci), self.getHeightCell(ri), true);
					arr[ri][ci] = val
				})
			});
			return arr
		},
		dirtyCells: function(_arr, refreshCompareBy) {
			var arr = [],
				self = this,
				ht, val, byVal = refreshCompareBy == "value";
			self.eachV(function(rd, ri) {
				ht = self.getHeightCell(ri);
				self.eachH(function(col, ci) {
					val = byVal ? rd[col.dataIndx] : self.generateCell(ri, ci, rd, col, self.getCellRegion(ri, ci), ht, true);
					if (_arr[ri] && _arr[ri][ci] !== val) {
						arr.push([ri, ci, rd, col])
					}
				})
			});
			return arr
		},
		generateCell: function(rip, ci, rd, column, _region, _ht, ignore) {
			var self = this,
				iMerge = self.iMerge,
				_wd, v_rip, v_ci, ui, region, v_region, isHead = self.isHead(),
				style = [],
				offset = self.riOffset,
				ri = rip + offset,
				cls = [self.cellCls],
				id, m;
			if (self._m() && (m = iMerge.ismergedCell(ri, ci))) {
				if (m.o_rc) {
					ui = iMerge.getClsStyle(ri, ci);
					ui.style && style.push(ui.style);
					ui.cls && cls.push(ui.cls);
					ri = m.o_ri;
					rip = ri - offset;
					rd = self.data[rip];
					ci = m.o_ci;
					column = self.colModel[ci];
					_ht = self.getHeightCellM(rip, m.o_rc);
					_wd = self.getWidthCellM(ci, m.o_cc);
					cls.push("pq-merge-cell")
				} else if (rip == self._initV || ci == self._initH) {
					region = self.getCellRegion(rip, ci);
					ui = iMerge.getRootCell(ri, ci);
					v_rip = ui.v_ri - offset;
					v_ci = ui.v_ci;
					if (v_rip < 0) {
						return ""
					}
					v_region = self.getCellRegion(v_rip, v_ci);
					self.mcLaid[v_rip + "," + v_ci + (v_region == region ? "" : "," + region)] = true;
					return ""
				} else {
					return ""
				}
			} else if (rd.pq_hidden || column.hidden) {
				return ""
			}
			id = self.getCellId(rip, ci, _region);
			if (!ignore && self.getById(id)) {
				return ""
			}
			var ht = _ht || self.getHeightCell(rip),
				wd = _wd || self.colwdArr[ci],
				left = self.getLeft(ci);
			style.push(self.rtl + ":" + left + "px;width:" + wd + "px;height:" + ht + "px;");
			return self.renderCell({
				style: style,
				cls: cls,
				attr: ["role=" + (isHead ? "columnheader" : "gridcell") + " id='" + id + "'"],
				rowData: rd,
				rowIndxPage: rip,
				rowIndx: ri,
				colIndx: ci,
				dataIndx: column.dataIndx,
				column: column
			})
		},
		generateRow: function(rip, region) {
			var cls = "pq-grid-row",
				style = "top:" + this.getTop(rip) + "px;height:" + this.getHeightR(rip) + "px;width:100%;",
				row_id = this.getRowId(rip, region),
				attr = "role=row id=" + row_id + " aria-rowindex=" + (rip + 1),
				arr = this.getRowClsStyleAttr(rip);
			cls += " " + arr[0];
			attr += " " + arr[1];
			return "<div class='" + cls + "' " + attr + " style='" + style + "'>"
		},
		getById: function(id) {
			return document.getElementById(id)
		},
		getCell: function(rip, ci, region) {
			var offset = this.riOffset,
				iM, m, ri = rip + offset;
			if (!region) {
				iM = this.iMerge;
				if (iM.ismergedCell(ri, ci)) {
					m = iM.getRootCell(ri, ci);
					if (this.isHead()) {
						rip = m.o_ri;
						ci = m.o_ci
					}
					region = this.getCellRegion(m.v_ri - offset, m.v_ci)
				}
			}
			return this.getById(this.getCellId(rip, ci, region))
		},
		getCellIndx: function(cell) {
			var arr = cell.id.split("-");
			if (arr[3] == "u" + this.uuid) {
				if (arr[5] == "") {
					return [arr[4] * 1, -1, arr[7]]
				}
				return [arr[4] * 1, arr[5] * 1, arr[6]]
			}
		},
		getCellId: function(rip, ci, region) {
			if (rip >= this.data.length) {
				return ""
			}
			region = region || this.getCellRegion(rip, ci);
			return this.cellPrefix + rip + "-" + ci + "-" + region
		},
		getCellCont: function(ri, ci) {
			return this["$c" + this.getCellRegion(ri, ci)]
		},
		getCellCoords: function(rip, ci) {
			var self = this,
				maxHt = self.maxHt,
				offset = self.riOffset,
				ri = rip + offset,
				rip2 = rip,
				c2 = ci,
				arr;
			if (self.isBody()) {
				arr = self.that.iMerge.inflateRange(ri, ci, ri, ci);
				rip2 = arr[2] - offset, c2 = arr[3]
			}
			var y1 = self.getTop(rip),
				y2 = self.getTop(rip2) + self.getHeightCell(rip2),
				x1 = self.getLeft(ci),
				x2 = self.getLeft(c2 + 1);
			if (y2 > maxHt) {
				y1 -= y2 - maxHt;
				y2 = maxHt
			}
			if (x2 > maxHt) {
				x1 -= x2 - maxHt;
				x2 = maxHt
			}
			return [x1, y1, x2, y2]
		},
		getCellRegion: function(rip, ci) {
			var fc = this.freezeCols,
				fr = this.freezeRows;
			if (rip < fr) {
				return ci < fc ? "lt" : "tr"
			} else {
				return ci < fc ? "left" : "right"
			}
		},
		getCellXY: function(rip, ci) {
			var maxHt = this.maxHt,
				left = Math.min(this.getLeft(ci), maxHt),
				top = Math.min(this.getTop(rip), maxHt);
			return [left, top]
		},
		getContRight: function() {
			return this.$cright
		},
		getMergeCells: function() {
			return this._m() ? this.$tbl.children().children(".pq-merge-cell") : $()
		},
		getRow: function(rip, region) {
			return this.getById(this.getRowId(rip, region))
		},
		getAllCells: function() {
			return this.$ele.children().children().children().children().children(this.isHead() ? ".pq-grid-col" : ".pq-grid-cell")
		},
		get$Col: function(ci, $cells) {
			var sel = ["right", "left", "lt", "rt"].map(function(region) {
				return "[id$=-" + ci + "-" + region + "]"
			}).join(",");
			return ($cells || this.getAllCells()).filter(sel)
		},
		get$Row: function(rip) {
			return this.$ele.find("[id^=" + this.getRowId(rip, "") + "]")
		},
		getRowClsStyleAttr: function(rip) {
			var self = this,
				that = self.that,
				rowStyle = self.rowStyle,
				cls = [],
				o = that.options,
				rowInit = o.rowInit,
				rd = self.data[rip] || {},
				pq_rowcls = rd.pq_rowcls,
				rowattr = rd.pq_rowattr,
				rowstyle = rd.pq_rowstyle,
				styleStr = pq.styleStr,
				tmp, retui, attr = "",
				style = [],
				ri = rip + self.riOffset;
			o.stripeRows && self.stripeArr[rip] && cls.push("pq-striped");
			if (rd.pq_rowselect) cls.push(that.iRows.hclass);
			pq_rowcls && cls.push(pq_rowcls);
			if (rowattr) {
				attr += that.processAttr(rowattr, style)
			}
			if (rowstyle) style.push(styleStr(rowstyle));
			if (rowInit) {
				retui = rowInit.call(that, {
					rowData: rd,
					rowIndxPage: rip,
					rowIndx: ri
				});
				if (retui) {
					if (tmp = retui.cls) cls.push(tmp);
					if (tmp = retui.attr) attr += " " + tmp;
					if (tmp = retui.style) style.push(styleStr(tmp))
				}
			}
			style = style.join("");
			rowStyle[rip] = style;
			return [cls.join(" "), attr]
		},
		getRowId: function(rip, region) {
			if (region == null) {
				throw "getRowId region."
			}
			return this.rowPrefix + rip + "-" + region
		},
		getRowIndx: function(row) {
			var id = row.id.split("-");
			return [id[4] * 1, id[5]]
		},
		getTable: function(ri, ci) {
			return this["$tbl_" + this.getCellRegion(ri, ci)]
		},
		getTblCls: function(o) {
			var cls = this.isBody() ? [] : ["pq-grid-summary-table"];
			if (o.rowBorders) cls.push("pq-td-border-top");
			if (o.columnBorders) cls.push("pq-td-border-right");
			if (!o.wrap) cls.push("pq-no-wrap");
			return cls.join(" ")
		},
		getFlexWidth: function() {
			return this._flexWidth
		},
		preInit: function($ele) {
			var self = this,
				isBody = self.isBody(),
				isHead = self.isHead(),
				that = self.that,
				o = that.options,
				focusMgr = '<div class="pq-focus-mgr"><textarea></textarea></div>',
				ns = that.eventNamespace,
				tblCls = "pq-table " + self.getTblCls(o),
				cls = ["pq-cont-inner ", "pq-cont-right", "pq-cont-left", "pq-cont-lt", "pq-cont-tr"];
			$ele.empty();
			$ele[0].innerHTML = ['<div class="pq-grid-cont">', isHead || isBody ? focusMgr : "", isBody ? '<div class="pq-grid-norows">' + o.strNoRows + "</div>" : "", '<div class="', cls[0] + cls[1], '"><div class="pq-table-right ' + tblCls + '"></div>', isBody ? "" : '<div class="pq-r-spacer" style="position:absolute;top:0;height:10px;"></div>', "</div>", '<div class="' + cls[0] + cls[2] + '"><div class="pq-table-left ' + tblCls + '"></div></div>', '<div class="' + cls[0] + cls[4] + '"><div class="pq-table-tr ' + tblCls + '"></div></div>', '<div class="' + cls[0] + cls[3] + '"><div class="pq-table-lt ' + tblCls + '"></div></div>', isHead || isBody ? focusMgr : "", "</div>"].join("");
			self.$cright = $ele.find("." + cls[1]).on("scroll", self.onNativeScroll.bind(self));
			self.virtualWin && $(window).on("scroll" + ns + " resize" + ns, self.onNativeScroll.bind(self));
			if (!isBody) self.$spacer = $ele.find(".pq-r-spacer");
			self.$cleft = $ele.find("." + cls[2]).on("scroll", self.onScrollL.bind(self));
			self.$clt = $ele.find("." + cls[3]).on("scroll", self.onScrollLT);
			self.$ctr = $ele.find("." + cls[4]).on("scroll", self.onScrollT);
			self.$tbl = $ele.find(".pq-table").on("scroll", self.onScrollLT);
			self.$tbl_right = $ele.find(".pq-table-right");
			self.$tbl_left = $ele.find(".pq-table-left");
			self.$tbl_lt = $ele.find(".pq-table-lt");
			self.$tbl_tr = $ele.find(".pq-table-tr");
			if (isBody) {
				function mw($ele) {
					$ele.on("mousewheel DOMMouseScroll", self.onMouseWheel(self))
				}
				mw(self.$cleft);
				mw(self.$ctr);
				self.$norows = $ele.find(".pq-grid-norows");
				that.$focusMgr = $ele.find(".pq-focus-mgr")
			} else if (isHead) {
				that.$focusMgrHead = $ele.find(".pq-focus-mgr")
			}
		},
		isBody: function() {},
		isHead: function() {},
		isSum: function() {},
		jump: function(initH, fc, ci) {
			if (ci < initH && ci >= fc) {
				ci = initH
			}
			return ci
		},
		hasMergeCls: function(cell) {
			return cell && cell.className.indexOf("pq-merge-cell") >= 0
		},
		initRefreshTimer: function(hChanged) {
			var self = this,
				fn = self.onRefreshTimer(self, hChanged);
			self.setTimer(fn, "refresh")
		},
		initStripeArr: function() {
			var rows = this.rows,
				i = 0,
				stripeArr = this.stripeArr = [],
				data = this.data,
				rd, striped;
			for (; i < rows; i++) {
				rd = data[i];
				if (rd && !rd.pq_hidden) {
					striped = stripeArr[i] = !striped
				}
			}
		},
		isRenderedRow: function(ri) {
			return !!this.getRow(ri)
		},
		onScrollLT: function() {
			this.scrollTop = this.scrollLeft = 0
		},
		onScrollT: function() {
			this.scrollTop = 0
		},
		onScrollL: function(evt) {
			var target = evt.target,
				self = this;
			pq.scrollLeft(target, 0);
			self.setTimer(function() {
				self.$cright[0].scrollTop = target.scrollTop
			}, "scrollL", 50)
		},
		refresh: function(ui) {
			ui = ui || {};
			var self = this,
				that = self.that,
				isBody = self.isBody(),
				isHead = self.isHead(),
				timer = ui.timer == null ? true : ui.timer,
				mcLaid = self.mcLaid = {},
				fc = self.freezeCols,
				numColWd = self.numColWd,
				fcPane = fc || numColWd ? true : false,
				fr = self.freezeRows,
				arr = self.calInitFinalSuper(),
				r1 = arr[0],
				c1 = arr[1],
				r2 = arr[2],
				c2 = arr[3],
				fullRefresh = ui.fullRefresh || arr[4],
				initV = self.initV,
				finalV = self.finalV,
				initH = self.initH,
				finalH = self.finalH;
			fullRefresh && isBody && that.blurEditor({
				force: true
			});
			self._initV = r1;
			self._finalV = r2;
			self._initH = c1;
			self._finalH = c2;
			isBody && that._trigger("beforeTableView", null, {
				initV: r1,
				finalV: r2,
				pageData: self.data
			});
			if (!fullRefresh) {
				if (finalV != null && r2 >= initV && r1 <= finalV) {
					if (r1 > initV) {
						self.removeView(initV, r1 - 1, initH, finalH);
						fcPane && self.removeView(initV, r1 - 1, numColWd ? -1 : 0, fc - 1)
					} else if (r1 < initV) {
						self.renderView(r1, initV - 1, c1, c2);
						fcPane && self.renderView(r1, initV - 1, 0, fc - 1)
					}
					if (r2 < finalV) {
						self.removeView(r2 + 1, finalV, initH, finalH);
						fcPane && self.removeView(r2 + 1, finalV, numColWd ? -1 : 0, fc - 1)
					} else if (r2 > finalV) {
						self.renderView(finalV + 1, r2, c1, c2);
						fcPane && self.renderView(finalV + 1, r2, 0, fc - 1)
					}
					initV = r1;
					finalV = r2
				}
				if (finalH != null && c2 > initH && c1 < finalH) {
					if (c1 > initH) {
						self.removeView(initV, finalV, initH, c1 - 1);
						fr && self.removeView(0, fr - 1, initH, c1 - 1)
					} else if (c1 < initH) {
						self.renderView(initV, finalV, c1, initH - 1);
						fr && self.renderView(0, fr - 1, c1, initH - 1)
					}
					if (c2 < finalH) {
						self.removeView(initV, finalV, c2 + 1, finalH);
						fr && self.removeView(0, fr - 1, c2 + 1, finalH)
					} else if (c2 > finalH) {
						self.renderView(initV, finalV, finalH + 1, c2);
						fr && self.renderView(0, fr - 1, finalH + 1, c2)
					}
					initH = c1;
					finalH = c2
				}
			}
			if (fullRefresh || (r2 !== finalV || r1 !== initV || c1 !== initH || c2 !== finalH)) {
				isBody && that._trigger("beforeViewEmpty", null, {
					region: "right"
				});
				self.$tbl_right.empty();
				self.renderView(r1, r2, c1, c2);
				if (fcPane && (r2 !== finalV || r1 !== initV)) {
					self.$tbl_left.empty();
					self.renderView(r1, r2, 0, fc - 1)
				}
				if (fr) {
					if (c1 !== initH || c2 !== finalH) {
						that._trigger("beforeViewEmpty", null, {
							region: "tr"
						});
						self.$tbl_tr.empty();
						self.renderView(0, fr - 1, c1, c2)
					}
					if (fcPane && finalV == null) {
						self.$tbl_lt.empty();
						self.renderView(0, fr - 1, 0, fc - 1)
					}
				}
			} else {
				self.removeMergeCells()
			}
			for (var key in mcLaid) {
				var arr = key.split(","),
					ri = arr[0] * 1,
					ci = arr[1] * 1,
					region = arr[2];
				self.renderView(ri, ri, ci, ci, region)
			}
			var initHChanged = c1 != self.initH || c2 != self.finalH,
				hChanged = initHChanged && self.initH != null;
			if (fullRefresh || r2 != self.finalV || r1 != self.initV || initHChanged) {
				self.initV = r1;
				self.finalV = r2;
				self.initH = c1;
				self.finalH = c2;
				if (isBody) that._trigger("refresh", null, {
					source: ui.source,
					hChanged: hChanged
				});
				else that._trigger(isHead ? "refreshHeader" : "refreshSum", null, {
					hChanged: hChanged
				})
			}
		},
		refreshAllCells: function(ui) {
			var self = this;
			self.initH = self.initV = self.finalH = self.finalV = null;
			ui = ui || {};
			ui.fullRefresh = true;
			self.refresh(ui)
		},
		refreshCell: function(rip, ci, rd, column) {
			var self = this,
				m = self.isBody() && self._m() ? self.iMerge.getRootCellV(rip + self.riOffset, ci) : 0,
				found, rip_o = rip,
				ci_o = ci,
				replace = function(cell, region) {
					if (cell) {
						found = true;
						cell.id = "";
						$(cell).replaceWith(self.generateCell(rip, ci, rd, column, region))
					}
				};
			if (m) {
				rip = m.rowIndxPage;
				ci = m.colIndx;
				rd = m.rowData;
				column = m.column;
				["lt", "tr", "left", "right"].forEach(function(region) {
					replace(self.getCell(rip_o, ci_o, region), region)
				})
			} else {
				replace(self.getCell(rip, ci))
			}
			return found
		},
		removeMergeCells: function() {
			var self = this,
				ui, arr, r1, c1, r2, c2, remove, m = self.iMerge,
				cell, region, offset = self.riOffset,
				fc = self.freezeCols,
				fr = self.freezeRows,
				$cells = self.getMergeCells(),
				initH = self._initH,
				finalH = self._finalH,
				initV = self._initV,
				finalV = self._finalV,
				i = 0,
				len = $cells.length,
				row;
			for (; i < len; i++) {
				cell = $cells[i];
				arr = self.getCellIndx(cell);
				if (arr) {
					r1 = arr[0];
					c1 = arr[1];
					region = arr[2];
					ui = m.getRootCell(r1 + offset, c1);
					r2 = r1 + ui.o_rc - 1;
					c2 = c1 + ui.o_cc - 1;
					remove = false;
					if (r1 > finalV || c1 > finalH) {
						remove = true
					} else if (region == "right") {
						if (r2 < initV || c2 < initH) remove = true
					} else if (region == "left") {
						if (r2 < initV) remove = true
					} else if (region == "tr") {
						if (c2 < initH) remove = true
					}
					row = cell.parentNode;
					remove && $(cell).remove();
					if (!row.children.length) {
						row.parentNode.removeChild(row)
					}
				}
			}
		},
		removeView: function(r1, r2, c1, c2) {
			var row, i, j, id, cell, region = this.getCellRegion(r1, c1);
			for (i = r1; i <= r2; i++) {
				row = this.getRow(i, region);
				if (row) {
					for (j = c1; j <= c2; j++) {
						cell = this.getCell(i, j, region);
						if (cell) {
							if (!this.hasMergeCls(cell)) {
								$(cell).remove()
							}
						}
					}
					if (!row.children.length) {
						row.parentNode.removeChild(row)
					}
				}
			}
		},
		renderNumCell: function(rip, nc, region) {
			var self = this,
				ht = self.getHeightR(rip),
				isHead = self.isHead(),
				id = self.getCellId(rip, -1, region),
				style = "width:" + nc + "px;height:" + ht + "px;";
			return "<div id='" + id + "' style='" + style + "' role='gridcell' class='pq-grid-number-cell " + "'>" + (self.isBody() ? rip + 1 + self.riOffset : isHead && rip == self.data.length - 1 ? self.numberCell.title || "" : "") + "</div>"
		},
		renderRow: function(arr, rd, ri, c1, c2, region) {
			var row = this.getRow(ri, region),
				nc = this.numColWd,
				localArr = [],
				htCell = this.getHeightCell(ri),
				str, CM = this.colModel,
				column, ci, div;
			!row && arr.push(this.generateRow(ri, region));
			if (c1 == 0 && nc && (region == "left" || region == "lt")) {
				div = this.renderNumCell(ri, nc, region);
				localArr.push(div)
			}
			for (ci = c1; ci <= c2; ci++) {
				column = CM[ci];
				if (column && !column.hidden) {
					div = this.generateCell(ri, ci, rd, column, region, htCell);
					localArr.push(div)
				}
			}
			str = localArr.join("");
			row ? $(row).append(str) : arr.push(str, "</div>")
		},
		renderView: function(r1, r2, c1, c2, region) {
			if (c1 == null || c2 == null) {
				return
			}
			region = region || this.getCellRegion(r1, Math.min(c1, c2));
			var arr = [],
				data = this.data,
				$tbl = this["$tbl_" + region],
				ri = r1,
				rd;
			for (; ri <= r2; ri++) {
				rd = data[ri] || {};
				if (!rd.pq_hidden && this.rowhtArr[ri] != null) {
					this.renderRow(arr, rd, ri, c1, c2, region)
				}
			}
			$tbl.append(arr.join(""))
		},
		scrollX: function(x, fn) {
			var c = this.$cright[0];
			if (x >= 0) {
				this.scrollXY(x, c.scrollTop, fn)
			} else return pq.scrollLeft(c)
		},
		setCellDims: function(heightOnly) {
			var self = this,
				rtl = self.rtl,
				iMerge = self.iMerge,
				_mergeCells = self._m(),
				m, CM = self.colModel,
				numColWd = self.numColWd,
				jump = self.jump,
				setRowDims = self.setRowDims(),
				offset = self.riOffset,
				initH = self.initH,
				finalH = self.finalH,
				fc = self.freezeCols,
				style;
			self.eachV(function(rd, rip) {
				var $row = self.get$Row(rip),
					ht = self.getHeightR(rip),
					top = self.getTop(rip),
					cell, htCell = self.getHeightCell(rip);
				setRowDims($row, ht, top);
				for (var ci = numColWd ? -1 : 0; ci <= finalH; ci++) {
					ci = jump(initH, fc, ci);
					if (ci < 0 || !CM[ci].hidden) {
						if (_mergeCells && (m = iMerge.ismergedCell(rip + offset, ci))) {} else {
							cell = self.getCell(rip, ci);
							if (cell) {
								style = cell.style;
								style.height = (ci == -1 ? ht : htCell) + "px";
								if (!heightOnly) {
									style.width = self.getWidthCell(ci) + "px";
									style[rtl] = self.getLeft(ci) + "px"
								}
							}
						}
					}
				}
			});
			var $merge = self.getMergeCells(),
				i = 0,
				len = $merge.length;
			for (; i < len; i++) {
				var cell = $merge[i],
					arr = self.getCellIndx(cell);
				if (arr) {
					var o_rip = arr[0],
						o_ci = arr[1],
						m = iMerge.getRootCell(o_rip + offset, o_ci),
						v_rip = m.v_ri - offset,
						$row = self.get$Row(v_rip),
						ht = self.getHeightR(v_rip),
						htCell = self.getHeightCellM(o_rip, m.o_rc),
						top = self.getTop(v_rip);
					setRowDims($row, ht, top);
					style = cell.style;
					style.height = htCell + "px";
					if (!heightOnly) {
						style.width = self.getWidthCellM(o_ci, m.o_cc) + "px";
						style[rtl] = self.getLeft(o_ci) + "px"
					}
				}
			}
		},
		setRowDims: function() {
			return function($row, ht, top) {
				var obj = {
					height: ht,
					width: "100%"
				};
				obj.top = top;
				$row.css(obj)
			}
		},
		setColWdArr: function(initH, finalH) {
			var ci = finalH,
				rip, self = this,
				offset = self.riOffset,
				jump = self.jump,
				CM = self.colModel,
				column, cell, rd, data = self.data,
				width, fr = self.freezeRows,
				maxWidth = self.maxHt + "px",
				wd, consider, iM = self.iMerge,
				m, initV = self.initV,
				child, child2, isBody = self.isBody(),
				isSum = self.isSum(),
				takeColumnWidths = isBody || isSum,
				finalV = self.isHead() ? self.that.headerCells.length - 1 : self.finalV;
			if (finalV >= 0) {
				for (; ci >= initH; ci--) {
					column = CM[ci];
					if (!column.hidden && (column.width + "").indexOf("%") == -1) {
						wd = takeColumnWidths ? column.width : column._minWidth;
						if (wd) {
							for (rip = 0; rip <= finalV; rip++) {
								rip = jump(initV, fr, rip);
								rd = data[rip];
								if (rd && !rd.pq_hidden) {
									consider = true;
									if (m = iM.ismergedCell(rip + offset, ci)) {
										if (m == true) {
											continue
										}
										m = iM.getRootCell(rip + offset, ci);
										if (m.v_rc > 1 || m.v_cc > 1) {
											if (m.v_cc > 1) continue;
											consider = false
										}
										cell = self.getCell(m.o_ri - offset, m.o_ci)
									} else {
										cell = self.getCell(rip, ci)
									}
									if (cell) {
										cell.parentNode.style.width = maxWidth;
										if (consider) {
											cell.style.width = "auto";
											child = $(cell).find(".pq-icon-menu,.pq-icon-filter");
											if (child.length) {
												child.css({
													position: "static",
													float: "left",
													width: 20
												});
												child2 = $(cell).find(".pq-td-div");
												child2.css("width", "auto")
											}
										}
										width = cell.offsetWidth + 1;
										if (consider && child.length) {
											child.css({
												position: "",
												float: "",
												width: ""
											});
											child2.css("width", "")
										}
										wd = Math.max(width, wd)
									}
								}
							}
							if (!(wd > 0)) {
								throw "wd NaN"
							}
							column.width = self.colwdArr[ci] = wd;
							column._resized = true
						}
					}
				}
			}
		},
		setRowHtArr: function(initV, finalV, hChanged) {
			var rip = finalV,
				ci, _ci, self = this,
				changed, jump = self.jump,
				offset = self.riOffset,
				rowhtArr = self.rowhtArr,
				newht, data = self.data,
				CM = self.colModel,
				rd, cell, height, _m = self._m(),
				diffV = self.diffV,
				fc = self.freezeCols,
				rowHtMin = self.rowHt,
				ht, iM = self.iMerge,
				m, rc, rowHtDetail = self.rowHtDetail,
				htDetail, initH = self.initH,
				finalH = self.finalH;
			for (; rip >= initV; rip--) {
				rd = data[rip];
				if (rd && !rd.pq_hidden && !rd.pq_htfix) {
					htDetail = rowHtDetail ? self.getHtDetail(rd, rowHtDetail) : 0;
					ht = hChanged ? rowhtArr[rip] - htDetail : rowHtMin;
					for (ci = 0; ci <= finalH; ci++) {
						_ci = ci, ci = jump(initH, fc, ci);
						if (!CM[ci].hidden) {
							if (m = _m && iM.ismergedCell(rip + offset, ci)) {
								if (m == true || diffV) {
									continue
								}
								m = iM.getRootCell(rip + offset, ci);
								cell = self.getCell(m.o_ri - offset, m.o_ci)
							} else {
								cell = self.getCell(rip, ci)
							}
							if (cell) {
								cell.style.height = "auto";
								height = cell.offsetHeight;
								if (m) {
									rc = m.o_rc - (m.v_ri - m.o_ri) - 1;
									height -= m.v_rc > 1 ? self.getHeightCellDirty(m.v_ri - offset + 1, rc) : 0
								}
								ht = Math.max(height, ht)
							}
						}
					}
					newht = ht + htDetail;
					if (rowhtArr[rip] != newht) {
						rowhtArr[rip] = rd.pq_ht = newht;
						changed = true
					}
				}
			}
			return changed
		},
		setTimer: function(rAF) {
			var timeID = {};
			return rAF === true ? function(fn) {
				fn()
			} : function(fn, id, interval) {
				clearTimeout(timeID[id]);
				var self = this;
				timeID[id] = setTimeout(function() {
					self.that.element && fn.call(self)
				}, interval || 300)
			}
		}
	}, new pq.cVirtual)
})(jQuery);
(function($) {
	pq.cRenderBody = function(that, obj) {
		var self = this,
			uuid = self.uuid = that.uuid,
			o = that.options,
			$b = self.$ele = obj.$b,
			$sum = self.$sum = obj.$sum,
			$h = self.$h = obj.$h,
			DMht, DM = o.detailModel,
			DMht = DM.height,
			prInterval = o.postRenderInterval;
		self.that = that;
		self.rowStyle = [];
		self.rtl = o.rtl ? "right" : "left";
		self.virtualWin = o.virtualWin;
		self.setTimer = self.setTimer(uuid);
		self.cellPrefix = "pq-body-cell-u" + uuid + "-";
		self.rowPrefix = "pq-body-row-u" + uuid + "-";
		self.cellCls = "pq-grid-cell";
		self.iMerge = that.iMerge;
		self.rowHt = o.rowHt || 27;
		self.rowHtDetail = DM.init ? DMht == "auto" ? 1 : DMht : 0;
		self.iRenderHead = that.iRenderHead = new pq.cRenderHead(that, $h);
		self.iRenderSum = that.iRenderSum = new pq.cRenderSum(that, $sum);
		that.on("headHtChanged", self.onHeadHtChanged(self));
		if (prInterval != null) {
			that.on("refresh refreshRow refreshCell refreshColumn", function() {
				if (prInterval < 0) self.postRenderAll();
				else self.setTimer(self.postRenderAll, "postRender", prInterval)
			})
		}
		self.preInit($b);
		that.on("refresh softRefresh", self.onRefresh.bind(self))
	};
	pq.cRenderBody.prototype = $.extend({}, new $.paramquery.cGenerateView, new pq.cRender, {
		setHtCont: function(ht) {
			this.dims.htCont = ht;
			this.$ele.css("height", ht)
		},
		flex: function(ui) {
			var self = this,
				that = self.that;
			if (that._trigger("beforeFlex", null, ui) !== false) {
				self.iRenderHead.autoWidth(ui);
				self.iRenderSum.autoWidth(ui);
				self.autoWidth(ui);
				that.refreshCM(null, {
					flex: true
				});
				that.refresh({
					source: "flex",
					soft: true
				})
			}
		},
		init: function(obj) {
			obj = obj || {};
			var self = this,
				that = self.that,
				soft = obj.soft,
				normal = !soft,
				source = obj.source,
				iRH = self.iRenderHead,
				iRS = self.iRenderSum,
				o = that.options,
				SM = o.scrollModel,
				fc = self.freezeCols = o.freezeCols || 0,
				fr = self.freezeRows = o.freezeRows,
				numberCell = self.numberCell = o.numberCell,
				CM = self.colModel = that.colModel,
				width = self.width = o.width,
				height = self.height = o.height,
				visibleRowIndx, data;
			if (normal) {
				self.dims = that.dims;
				self.autoFit = SM.autoFit;
				self.pauseTO = SM.timeout;
				data = that.pdata || [];
				visibleRowIndx = data.findIndex(function(rd) {
					return !rd || !rd.pq_hidden
				});
				self.$norows.css("display", visibleRowIndx >= 0 ? "none" : "");
				self.data = data;
				self.maxHt = pq.cVirtual.maxHt;
				self.riOffset = that.riOffset;
				self.cols = CM.length;
				self.rows = data.length;
				if (that._mergeCells) self._m = function() {
					return true
				};
				self.autoRow = o.autoRow;
				if (!obj.skipIndx || (self.rowhtArr || []).length != self.rows) {
					self.initRowHtArrSuper();
					if (o.stripeRows) self.initStripeArr()
				}
			}
			self.refreshColumnWidths();
			self.numColWd = iRH.numColWd = iRS.numColWd = numberCell.show ? numberCell.width : 0;
			self.initColWdArrSuper();
			iRS.init(obj);
			if (obj.header) iRH.init(obj);
			else {
				self.setPanes();
				iRH.setCellDims();
				iRH.assignTblDims(true)
			}
			iRS.initPost(obj);
			obj.header && iRH.initPost(obj);
			if (self.$cright[0].scrollTop > self.getTop(self.rows)) {
				return
			}
			if (normal) {
				self.refreshAllCells({
					source: source
				})
			} else if (soft) {
				self.setCellDims();
				self.refresh({
					source: source
				});
				that._trigger("softRefresh")
			}
		},
		initColWdArr: function() {
			var CM = this.colModel,
				len = CM.length,
				column, leftArr = this.leftArr = this.iRenderHead.leftArr = this.iRenderSum.leftArr = [],
				i = 0,
				colwdArr = this.colwdArr = this.iRenderHead.colwdArr = this.iRenderSum.colwdArr = [];
			for (; i < len; i++) {
				column = CM[i];
				colwdArr[i] = column.hidden ? 0 : column._width
			}
		},
		initColWdArrSuper: function() {
			this.initColWdArr();
			this.setTopArr(0, true);
			this.assignTblDims(true)
		},
		inViewport: function(rip, ci, cell) {
			cell = cell || this.getCell(rip, ci);
			var dims = this.dims,
				left = dims.left - 2,
				right = dims.right - (dims.wdCont - dims.wdContClient) + 2,
				top = dims.top - 2,
				bottom = dims.bottom - (dims.htCont - dims.htContClient) + 2,
				region = this.getCellRegion(rip, ci),
				row = cell.parentNode,
				x1 = cell.offsetLeft - dims.wdContLeft,
				y1 = row.offsetTop - dims.htContTop,
				x2 = x1 + cell.offsetWidth,
				y2 = y1 + cell.offsetHeight;
			if (region == "right") {
				return x1 > left && x2 < right && y1 > top && y2 < bottom
			} else if (region == "tr") {
				return x1 > left && x2 < right
			} else if (region == "left") {
				return y1 > top && y2 < bottom
			} else {
				return true
			}
		},
		isBody: function() {
			return true
		},
		onHeadHtChanged: function(self) {
			return function(evt, ht) {
				self.setPanes()
			}
		},
		onMouseWheel: function(self) {
			var timeID;
			return function(evt) {
				var ele = this;
				ele.style["pointer-events"] = "none";
				clearTimeout(timeID);
				timeID = setTimeout(function() {
					ele.style["pointer-events"] = ""
				}, 300)
			}
		},
		onNativeScroll: function() {
			var self = this,
				cr = self.$cright[0],
				that = self.that,
				sl = cr.scrollLeft,
				st = cr.scrollTop;
			if (that.element[0].offsetWidth) {
				self.iRenderSum.setScrollLeft(sl);
				self.iRenderHead.setScrollLeft(sl);
				self.$cleft[0].scrollTop = st;
				self.$ctr[0].scrollLeft = sl;
				self.refresh();
				that._trigger("scroll");
				self.setTimer(function() {
					that._trigger("scrollStop")
				}, "scrollStop", self.pauseTO)
			}
		},
		onRefresh: function(evt, ui) {
			if (ui.source != "autoRow") this.initRefreshTimer(ui.hChanged)
		},
		onRefreshTimer: function(self, hChanged) {
			return function() {
				var cr = self.$cright[0];
				self.autoRow && self.autoHeight({
					hChanged: hChanged
				});
				cr.scrollTop = cr.scrollTop;
				cr.scrollLeft = cr.scrollLeft
			}
		},
		pageDown: function(rip, fn) {
			var self = this,
				arr = self.topArr,
				prevTop = arr[rip],
				top, tmp = rip,
				dims = self.dims,
				stop = this.$cright[0].scrollTop,
				diff = Math.min(dims.htContClient - dims.htContTop, $(window).height()) * 95 / 100,
				reqTop = prevTop + diff,
				i = rip,
				len = arr.length - 1;
			self.scrollY(stop + diff, function() {
				i = rip < self.initV ? self.initV : rip;
				for (; i <= len; i++) {
					top = arr[i];
					if (top > prevTop) {
						prevTop = top;
						tmp = i - 1
					}
					if (top > reqTop) {
						tmp = i - 1;
						break
					}
				}
				fn(tmp)
			})
		},
		pageUp: function(rip, fn) {
			var self = this,
				arr = self.topArr,
				prevTop = arr[rip],
				top, stop = this.$cright[0].scrollTop,
				dims = self.dims,
				diff = Math.min($(window).height(), dims.htContClient - dims.htContTop) * 9 / 10,
				reqTop = prevTop - diff,
				tmp = rip,
				i = rip;
			for (; i >= 0; i--) {
				top = arr[i];
				if (top < prevTop) {
					prevTop = top;
					tmp = i
				}
				if (top < reqTop) {
					tmp = i;
					break
				}
			}
			self.scrollY(stop - diff, function() {
				fn(tmp)
			})
		},
		postRenderAll: function() {
			var self = this,
				grid = self.that,
				offset = self.riOffset,
				cell, ui, iM = self.iMerge,
				data = self.data,
				CM = self.colModel,
				postRender;
			self.eachH(function(column, ci) {
				if (postRender = column.postRender) {
					self.eachV(function(rd, rip) {
						ui = iM.getRootCellO(rip + offset, ci, true);
						cell = self.getCell(ui.rowIndxPage, ui.colIndx);
						if (cell && !cell._postRender) {
							ui.cell = cell;
							grid.callFn(postRender, ui);
							cell._postRender = true
						}
					})
				}
			});
			if (postRender = self.numberCell.postRender) {
				self.eachV(function(rd, rip) {
					var cell = self.getCell(rip, -1),
						ri = rip + offset,
						ui = {
							rowIndxPage: rip,
							colIndx: -1,
							rowIndx: ri,
							rowData: data[ri]
						};
					if (cell && !cell._postRender) {
						ui.cell = cell;
						grid.callFn(postRender, ui);
						cell._postRender = true
					}
				})
			}
		},
		refreshRow: function(ri) {
			var self = this,
				initH = self.initH,
				finalH = self.finalH,
				fc = self.freezeCols,
				$rows = self.get$Row(ri),
				c1, c2, regions = [];
			$rows.each(function(i, row) {
				var arr = self.getRowIndx(row);
				regions.push(arr[1])
			});
			self.that._trigger("beforeViewEmpty", null, {
				rowIndxPage: ri
			});
			$rows.remove();
			regions.forEach(function(region) {
				if (region == "left" || region == "lt") {
					c1 = 0;
					c2 = fc - 1
				} else {
					c1 = initH;
					c2 = finalH
				}
				self.renderView(ri, ri, c1, c2, region)
			})
		},
		newScrollPos: function(rip, left) {
			var self = this,
				dims = self.dims,
				htContClient = dims[left ? "wdContClient" : "htContClient"],
				newScrollTop, scrollTopStr = left ? "scrollLeft" : "scrollTop",
				cr = self.$cright[0],
				data_len = self[left ? "colModel" : "data"].length,
				fr = self[left ? "freezeCols" : "freezeRows"],
				scrollTop = pq[scrollTopStr](cr),
				htContTop = dims[left ? "wdContLeft" : "htContTop"],
				diffTop, diffBot, $win, winScrollTop;
			if (rip < fr || rip > data_len - 1) {
				return scrollTop
			}
			var top = self.getTopSafe(rip, left),
				htCell = self[left ? "getWidthCell" : "getHeightR"](rip);
			if (top != null) {
				if (!left && self.virtualWin) {
					$win = $(window);
					winScrollTop = $win.scrollTop();
					diffTop = top - scrollTop + $(cr).offset().top - winScrollTop;
					diffBot = diffTop - $win.height();
					if (diffBot >= 0) {
						$win.scrollTop(winScrollTop + diffBot + htCell)
					} else if (diffTop < 0) {
						$win.scrollTop(winScrollTop + diffTop)
					}
				}
				if (top + htCell + 1 > scrollTop + htContClient) {
					newScrollTop = top + htCell + 1 - htContClient;
					if (top < newScrollTop + htContTop) {
						newScrollTop = top - htContTop
					}
				} else if (top < scrollTop + htContTop) {
					newScrollTop = top - htContTop
				}
				newScrollTop = newScrollTop < 0 ? 0 : newScrollTop;
				return newScrollTop >= 0 ? newScrollTop : scrollTop
			}
		},
		scrollColumn: function(ci, fn) {
			var x = this.newScrollPos(ci, true);
			this.scrollX(x, fn)
		},
		scrollRow: function(rip, fn) {
			var y = this.newScrollPos(rip);
			this.scrollY(y, fn)
		},
		scrollCell: function(rip, ci, fn) {
			var y = this.newScrollPos(rip),
				x = this.newScrollPos(ci, true);
			this.scrollXY(x, y, fn)
		},
		scrollY: function(y, fn) {
			var c = this.$cright[0];
			if (y != null) {
				y = y >= 0 ? y : 0;
				this.scrollXY(pq.scrollLeft(c), y, fn)
			} else return c.scrollTop
		},
		scrollXY: function(x, y, fn) {
			var c = this.$cright[0],
				that = this.that,
				oldX = c.scrollLeft,
				oldY = c.scrollTop,
				newX, newY;
			if (x >= 0) {
				pq.scrollLeft(c, x);
				c.scrollTop = y;
				newX = c.scrollLeft;
				newY = c.scrollTop;
				if (fn) {
					if (newX == oldX && newY == oldY) fn();
					else that.one("scroll", function() {
						if (newX == oldX) fn();
						else that.one("scrollHead", fn)
					})
				}
			} else return [oldX, oldY]
		},
		getSBHt: function(wdTbl) {
			var dims = this.dims,
				o = this.that.options,
				sbDim = pq.cVirtual.SBDIM;
			if (this.autoFit) {
				return 0
			} else if (this.width == "flex" && !o.maxWidth) {
				return 0
			} else if (wdTbl > dims.wdCenter + sbDim) {
				return sbDim
			} else {
				return 0
			}
		},
		getSBWd: function() {
			var dims = this.dims,
				o = this.that.options,
				hideVScroll = o.hideVScroll;
			return !dims.htCenter || hideVScroll && dims.htCenter > (dims.htTblHead || 0) + dims.htTbl + dims.htTblSum ? 0 : pq.cVirtual.SBDIM
		},
		setPanes: function() {
			var self = this,
				that = self.that,
				o = that.options,
				autoFit = self.autoFit,
				dims = self.dims,
				htBody = dims.htCenter - dims.htHead - dims.htSum,
				wdBody = dims.wdCenter,
				$ele = self.$ele,
				fc = self.freezeCols,
				fr = self.freezeRows,
				$cr = self.$cright,
				cr = $cr[0],
				$cl = self.$cleft,
				$clt = self.$clt,
				$ctr = self.$ctr,
				wdLeftPane = self.getLeft(fc),
				sbDim = pq.cVirtual.SBDIM,
				flexWd = dims.wdTbl,
				flexHt = Math.max(dims.htTbl, 30) + self.getSBHt(flexWd),
				clientWidth, offsetWidth, clientHeight, htTopPane = self.getTopSafe(fr);
			$ctr.css("display", fr ? "" : "none");
			$cl.css("display", wdLeftPane ? "" : "none");
			$clt.css("display", wdLeftPane && fr ? "" : "none");
			$cr.css("overflow-y", "");
			if (self.height == "flex") {
				if (htBody > 0 && flexHt > htBody) {
					flexHt = Math.min(flexHt, htBody)
				} else {
					$cr.css("overflow-y", "hidden")
				}
				self.setHtCont(flexHt)
			} else {
				self.setHtCont(htBody)
			}
			if (autoFit && self.getSBWd()) {
				$cr.css("overflow-y", "scroll")
			}
			$cr.css("overflow-x", autoFit ? "hidden" : "");
			if (self.width == "flex") {
				flexWd = parseInt($ele[0].style.height) >= dims.htTbl - 1 ? flexWd : flexWd + sbDim;
				if (o.maxWidth && flexWd > wdBody) {
					flexWd = Math.min(flexWd, wdBody)
				} else {
					$cr.css("overflow-x", "hidden")
				}
				self._flexWidth = flexWd;
				$ele.width(self._flexWidth)
			} else {
				$ele.css("width", "")
			}
			self.htCont = dims.htCont = $cr.height();
			self.wdCont = dims.wdCont = $cr.width();
			dims.htContClient = clientHeight = cr.clientHeight;
			dims.wdContClient = clientWidth = cr.clientWidth;
			if (wdLeftPane > clientWidth) {
				$cr.css("overflow-x", "hidden");
				wdLeftPane = clientWidth
			}
			$cl.css("width", wdLeftPane);
			$clt.css("width", wdLeftPane);
			$ctr.width(clientWidth);
			$cl.height(clientHeight);
			offsetWidth = cr.offsetWidth;
			self.iRenderHead.setWidth(offsetWidth, clientWidth);
			self.iRenderSum.setWidth(offsetWidth, clientWidth);
			if (htTopPane > clientHeight) {
				$cr.css("overflow-y", "hidden");
				htTopPane = clientHeight
			}
			$clt.css("height", htTopPane);
			$ctr.css("height", htTopPane);
			self.wdContLeft = dims.wdContLeft = $cl.width();
			self.htContTop = dims.htContTop = $ctr.height()
		}
	}, new pq.cVirtual)
})(jQuery);
(function($) {
	function cMerge(that) {
		this.that = that
	}
	$.paramquery.cMergeHead = cMerge;
	cMerge.prototype = {
		getRootCell: function(ri, ci) {
			var that = this.that,
				hc = that.headerCells,
				column = hc[ri][ci],
				rc = column.rowSpan,
				o_ci = column.leftPos;
			while (ri) {
				if (hc[ri - 1][o_ci] != column) {
					break
				} else {
					ri--
				}
			}
			return {
				v_ri: ri,
				o_ri: ri,
				v_ci: that.getNextVisibleCI(o_ci),
				o_ci: o_ci,
				v_rc: rc,
				o_rc: rc,
				v_cc: column.colSpan,
				o_cc: column.o_colspan
			}
		},
		ismergedCell: function(ri, ci) {
			var that = this.that,
				hc = that.headerCells,
				row = hc[ri],
				column = row ? row[ci] : "",
				o_ci, rc, v_cc, v_ci;
			if (column) {
				o_ci = column.leftPos;
				if ((ri == 0 || hc[ri - 1][ci] !== column) && (v_ci = that.getNextVisibleCI(o_ci)) == ci) {
					rc = column.rowSpan;
					v_cc = column.colSpan;
					if (rc && v_cc && (rc > 1 || v_cc > 1)) {
						return {
							o_ri: ri,
							o_ci: o_ci,
							v_rc: rc,
							o_rc: rc,
							v_cc: v_cc,
							o_cc: column.o_colspan
						}
					}
				} else if (column.colSpan > 1 || column.rowSpan > 1) {
					return true
				}
			}
		},
		getClsStyle: function() {
			return {}
		}
	}
})(jQuery);
(function($) {
	pq.cRenderHS = $.extend({}, new pq.cRender, {
		init: function(obj) {
			obj = obj || {};
			var self = this,
				that = self.that,
				o = that.options,
				CM = self.colModel = that.colModel,
				isHead = self.isHead(),
				isSum = self.isSum(),
				autoRow = isHead ? o.autoRowHead : o.autoRowSum,
				headerCells = that.headerCells,
				filterRow = o.filterModel.header,
				data;
			self.freezeCols = o.freezeCols || 0;
			self.numberCell = o.numberCell;
			self.width = o.width;
			self.height = "flex";
			self.freezeRows = 0;
			self.dims = that.dims;
			if (isHead) {
				data = self.data = o.showHeader ? filterRow ? headerCells.concat([
					[]
				]) : headerCells : filterRow ? [
					[]
				] : []
			} else if (isSum) {
				data = self.data = o.summaryData || []
			}
			self.maxHt = pq.cVirtual.maxHt;
			self.riOffset = 0;
			self.cols = CM.length;
			self.rows = data.length;
			if (isHead) {
				if (headerCells.length > 1) self._m = function() {
					return true
				}
			} else {
				if (o.stripeRows) self.initStripeArr()
			}
			self.autoRow = autoRow == null ? o.autoRow : autoRow;
			self.initRowHtArrSuper();
			self.assignTblDims(true);
			self.setPanes()
		},
		initPost: function(obj) {
			var self = this;
			if (self.data.length && (obj || {}).soft) {
				self.setCellDims();
				self.refresh()
			} else {
				self.refreshAllCells()
			}
		},
		onNativeScroll: function() {
			var self = this;
			self.refresh();
			self.isHead() && self.that._trigger("scrollHead")
		},
		onRefresh: function(evt, ui) {
			this.initRefreshTimer(ui.hChanged)
		},
		refreshHS: function() {
			this.init();
			this.initPost()
		},
		setPanes: function() {
			var self = this,
				that = self.that,
				dims = self.dims,
				$ele = self.$ele,
				fc = self.freezeCols,
				$cr = self.$cright,
				cr = $cr[0],
				$cl = self.$cleft,
				wdLeftPane = self.getLeft(fc),
				isHead = self.isHead(),
				isSum = self.isSum(),
				flexHt = self.getTopSafe(self.rows),
				data_len = self.data.length;
			$cl.css("display", wdLeftPane ? "" : "none");
			$ele.height(flexHt);
			if (isHead) {
				dims.htHead = flexHt;
				that._trigger("headHtChanged")
			} else if (isSum) {
				dims.htSum = flexHt;
				that._trigger("headHtChanged")
			}
			self.htCont = $cr.height();
			self.wdCont = $cr.width();
			$cl.css("width", wdLeftPane);
			$cl.height(cr.clientHeight);
			self.wdContLeft = $cl.width();
			self.htContTop = 0
		},
		setScrollLeft: function(sl) {
			var $cr = this.$cright;
			if ($cr && this.scrollLeft !== sl) this.scrollLeft = $cr[0].scrollLeft = sl
		},
		setWidth: function(offsetWidth, clientWidth) {
			this.$spacer.width(offsetWidth - clientWidth)
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cRenderHead = pq.cRenderHead = function(that, $h) {
			var o = that.options,
				self = this,
				$h_i, uuid = self.uuid = that.uuid;
			self.that = that;
			self.iMerge = new _pq.cMergeHead(that);
			self.$ele = $h;
			self.height = "flex";
			self.scrollTop = 0;
			self.rtl = o.rtl ? "right" : "left";
			self.rowHt = o.rowHtHead || 28;
			self.cellCls = "pq-grid-col";
			self.setTimer = self.setTimer(true);
			self.cellPrefix = "pq-head-cell-u" + uuid + "-";
			self.rowPrefix = "pq-head-row-u" + uuid + "-";
			self.preInit($h);
			$h_i = that.$head_i = $h.children(".pq-grid-cont");
			$h_i.on("click", self.onHeaderClick.bind(self));
			that.on("headerKeyDown", self.onHeaderKeyDown.bind(self)).on("refreshHeader softRefresh", self.onRefresh.bind(self))
		};
	cRenderHead.prototype = $.extend({}, pq.cRenderHS, _pq.mixHeader, _pq.mixHeaderFilter, {
		getRowClsStyleAttr: function(ri) {
			var that = this.that,
				len = that.headerCells.length,
				cls = "";
			if (ri == len - 1) cls = "pq-grid-title-row";
			else if (len == ri) cls = "pq-grid-header-search-row";
			return [cls, "", ""]
		},
		getTblCls: function(o) {
			var cls = "pq-grid-header-table";
			return o.hwrap ? cls : cls + " pq-no-wrap"
		},
		isHead: function() {
			return true
		},
		onRefreshTimer: function(self, initHChanged) {
			return function() {
				var cr = self.$cright[0];
				self.autoRow && self.autoHeight({
					timer: false,
					hChanged: initHChanged
				});
				cr.scrollTop = 0;
				cr.scrollLeft = cr.scrollLeft;
				self.onCreateHeader();
				self.refreshResizeColumn();
				self.setSortIcons();
				self.that._trigger("refreshHeadAsync")
			}
		},
		_resizeId: function(ci) {
			return "pq-resize-div-" + this.uuid + "-" + ci
		},
		_resizeCls: function() {
			return "pq-resize-div-" + this.uuid
		},
		_resizeDiv: function(ci) {
			return this.getById(this._resizeId(ci))
		},
		refreshResizeColumn: function() {
			var initH = this.initH,
				CM = this.colModel,
				column, resizeCls = this._resizeCls(),
				finalH = this.finalH,
				numberCell = this.numberCell,
				fc = this.freezeCols,
				buffer1 = [],
				buffer2 = [],
				buffer, lftCol, lft, id, ci = numberCell.show ? -1 : 0;
			this.$ele.find("." + resizeCls).remove();
			for (; ci <= finalH; ci++) {
				if (ci >= initH) {
					buffer = buffer2
				} else if (ci < fc) {
					buffer = buffer1
				} else {
					continue
				}
				column = ci >= 0 ? CM[ci] : numberCell;
				if (!column.hidden && column.resizable !== false && !this._resizeDiv(ci)) {
					lftCol = this.getLeft(ci + 1);
					lft = lftCol - 5;
					id = this._resizeId(ci);
					buffer.push("<div id='", id, "' pq-col-indx='", ci, "' style='", this.rtl, ":", lft, "px;'", " class='pq-grid-col-resize-handle " + resizeCls + "'>&nbsp;</div>")
				}
			}
			buffer1.length && this.$cleft.append(buffer1.join(""));
			buffer2.length && this.$cright.append(buffer2.join(""))
		},
		renderCell: function(ui) {
			var rd = ui.rowData,
				ci = ui.colIndx,
				attr = ui.attr,
				cls = ui.cls,
				style = ui.style,
				column = rd[ci],
				val;
			if (column) {
				if (column.colSpan > 1) {
					style.push("z-index:3;")
				}
				ui.column = column;
				return this.createHeaderCell(ui)
			} else {
				val = this.renderFilterCell(ui.column, ci, cls);
				return "<div " + attr + " class='" + cls.join(" ") + "' style='" + style.join("") + "'>" + val + "</div>"
			}
		}
	})
})(jQuery);
(function($) {
	var _pq = $.paramquery,
		cRenderSum = pq.cRenderSum = function(that, $bottom) {
			var o = that.options,
				self = this,
				uuid = self.uuid = that.uuid;
			self.that = that;
			self.rtl = o.rtl ? "right" : "left";
			self.rowStyle = [];
			self.iMerge = {
				ismergedCell: function() {}
			};
			self.$ele = $bottom;
			self.height = "flex";
			self.scrollTop = 0;
			self.rowHt = o.rowHtSum || 27;
			self.cellCls = "pq-grid-cell";
			self.setTimer = self.setTimer(true);
			self.cellPrefix = "pq-sum-cell-u" + uuid + "-";
			self.rowPrefix = "pq-sum-row-u" + uuid + "-";
			self.preInit($bottom);
			that.on("refreshSum softRefresh", self.onRefresh.bind(self))
		};
	cRenderSum.prototype = $.extend({}, new _pq.cGenerateView, pq.cRenderHS, {
		isSum: function() {
			return true
		},
		onRefreshTimer: function(self, initHChanged) {
			return function() {
				var cr = self.$cright[0];
				self.autoRow && self.autoHeight({
					timer: false,
					hChanged: initHChanged
				});
				cr.scrollTop = 0;
				cr.scrollLeft = cr.scrollLeft
			}
		}
	})
})(jQuery);