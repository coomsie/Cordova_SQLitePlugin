//
//  	sqlite_plugin.js
//  	SQLitePlugin Cordova Plugin
//
//  	Created by  @Joenoon:
//
//      Adapted to 1.5 by coomsie
//

var CDVSQLitePlugin = function(dbPath, openSuccess, openError) {

	/// vars
	this.callbacks = callbacks;
	this.counter = counter;
	this.root = this;
	this.calbacks = callbacks = {};
	this.counter = 0;

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

	this.cbref = function(hash) {
		var f;
		f = "cb" + (counter += 1);
		callbacks[f] = hash;
		return f;
	};

	this.getOptions = function(opts, success, error) {
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

	this.handleCallback = function(ref, type, obj) {
		var _ref;
		if(( _ref = callbacks[ref]) != null) {
			if( typeof _ref[type] === "function") {
				_ref[type](obj);
			}
		}
		callbacks[ref] = null;
		delete callbacks[ref];
	};
	
	this.CDVSQLitePluginTransaction = function (dbPath) {
			this.dbPath = dbPath;
			this.executes = [];
	};
	
};

CDVSQLitePlugin.prototype.openDBs = {};

/**
 * Handle callback
 */

/**
 * Executes the sql.
 */

CDVSQLitePlugin.prototype.executeSql = function(sql, success, error) {
	var opts;
	if(!sql) {
		throw new Error("Cannot executeSql without a query");
	}
	opts = this.getOptions({
		query : [].concat(sql || []),
		path : this.dbPath
	}, success, error);
	Cordova.exec("CDVSQLitePlugin.backgroundExecuteSql", opts);
};
/**
 * Transaction
 */

CDVSQLitePlugin.prototype.transaction = function(fn, success, error) {
	var t;
	t = new CDVSQLitePluginTransaction(this.dbPath);
	fn(t);
	return t.complete(success, error);
};
/**
 * Open Database
 */

CDVSQLitePlugin.prototype.open = function(success, error) {
	var opts;
	if(!(this.dbPath in this.openDBs)) {
		this.openDBs[this.dbPath] = true;
		opts = this.getOptions({
			path : this.dbPath
		}, success, error);
		Cordova.exec("CDVSQLitePlugin.open", opts);
	}
};
/**
 * Close Database
 */

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

CDVSQLitePlugin.Transaction = function CDVSQLitePluginTransaction(dbPath) {
	this.dbPath = dbPath;
	this.executes = [];
};

CDVSQLitePlugin.Transaction.prototype.executeSql = function(sql, success, error) {
	this.executes.push(getOptions({
		query : [].concat(sql || []),
		path : this.dbPath
	}, success, error));
};
/**
 * Transaction Complete
 */

CDVSQLitePlugin.Transaction.prototype.complete = function(success, error) {
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

Cordova.addConstructor(function() {
	if(!window.plugins) {
		window.plugins = {};
	}
	window.plugins.CDVSQLitePlugin = new CDVSQLitePlugin();
});
