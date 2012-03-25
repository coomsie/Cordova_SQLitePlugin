(function() {
	var callbacks, cbref, counter, getOptions, root;
	root = this;
	callbacks = {};
	counter = 0;
	cbref = function(hash) {
		var f;
		f = "cb" + (counter += 1);
		callbacks[f] = hash;
		return f;
	};
	getOptions = function(opts, success, error) {
		var cb, has_cbs;
		cb = {};
		has_cbs = false;
		if( typeof success === "function") {
			has_cbs = true;
			cb.success = success;
		}
		if( typeof error === "function") {
			has_cbs = true;
			cb.error = error;
		}
		if(has_cbs) {
			opts.callback = cbref(cb);
		}
		return opts;
	};
	root.CDVSQLitePlugin = (function() {
		CDVSQLitePlugin.prototype.openDBs = {};
		function CDVSQLitePlugin(dbPath, openSuccess, openError) {
			this.dbPath = dbPath;
			this.openSuccess = openSuccess;
			this.openError = openError;
			if(!dbPath) {
				throw new Error("Cannot create a CDVSQLitePlugin instance without a dbPath");
			}
			this.openSuccess || (this.openSuccess = function() {
				console.log("DB opened: " + dbPath);
			});
			this.openError || (this.openError = function(e) {
				console.log(e.message);
			});
			this.open(this.openSuccess, this.openError);
		}


		CDVSQLitePlugin.handleCallback = function(ref, type, obj) {
			var _ref;
			if(( _ref = callbacks[ref]) != null) {
				if( typeof _ref[type] === "function") {
					_ref[type](obj);
				}
			}
			callbacks[ref] = null;
			delete callbacks[ref];
		};
		
		CDVSQLitePlugin.prototype.executeSql = function(sql, success, error) {
			var opts;
			if(!sql) {
				throw new Error("Cannot executeSql without a query");
			}
			opts = getOptions({
				query : [].concat(sql || []),
				path : this.dbPath
			}, success, error);
			Cordova.exec("CDVSQLitePlugin.backgroundExecuteSql", opts);
		};
		
		CDVSQLitePlugin.prototype.transaction = function(fn, success, error) {
			var t;
			t = new root.CDVSQLitePluginTransaction(this.dbPath);
			fn(t);
			return t.complete(success, error);
		};
		CDVSQLitePlugin.prototype.open = function(success, error) {
			var opts;
			if(!(this.dbPath in this.openDBs)) {
				this.openDBs[this.dbPath] = true;
				opts = getOptions({
					path : this.dbPath
				}, success, error);
				Cordova.exec("CDVSQLitePlugin.open", opts);
			}
		};
		CDVSQLitePlugin.prototype.close = function(success, error) {
			var opts;
			if(this.dbPath in this.openDBs) {
				delete this.openDBs[this.dbPath];
				opts = getOptions({
					path : this.dbPath
				}, success, error);
				Cordova.exec("CDVSQLitePlugin.close", opts);
			}
		};
		return CDVSQLitePlugin;
	})();
	root.CDVSQLitePluginTransaction = (function() {
		function CDVSQLitePluginTransaction(dbPath) {
			this.dbPath = dbPath;
			this.executes = [];
		}


		CDVSQLitePluginTransaction.prototype.executeSql = function(sql, success, error) {
			this.executes.push(getOptions({
				query : [].concat(sql || []),
				path : this.dbPath
			}, success, error));
		};
		CDVSQLitePluginTransaction.prototype.complete = function(success, error) {
			var begin_opts, commit_opts, executes, opts;
			if(this.__completed) {
				throw new Error("Transaction already run");
			}
			this.__completed = true;
			begin_opts = getOptions({
				query : ["BEGIN;"],
				path : this.dbPath
			});
			commit_opts = getOptions({
				query : ["COMMIT;"],
				path : this.dbPath
			}, success, error);
			executes = [begin_opts].concat(this.executes).concat([commit_opts]);
			opts = {
				executes : executes
			};
			Cordova.exec("CDVSQLitePlugin.backgroundExecuteSqlBatch", opts);
			this.executes = [];
		};
		return CDVSQLitePluginTransaction;
	})();
}).call(this);
