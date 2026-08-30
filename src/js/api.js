/**
 * API Client - 链池溯源平台前后端数据交互层
 * 替代静态MockData，从后端SQLite数据库读取真实可修改数据
 */

var API_BASE = '';

var ApiService = {

    _token: null,

    setToken: function(token) {
        this._token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    },

    getToken: function() {
        if (!this._token) {
            this._token = localStorage.getItem('auth_token') || null;
        }
        return this._token;
    },

    _getHeaders: function(contentType) {
        var headers = {};
        if (contentType) headers['Content-Type'] = contentType;
        var token = this.getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    },

    async get(url) {
        var resp = await fetch(API_BASE + url, {
            headers: this._getHeaders()
        });
        if (!resp.ok) {
            if (resp.status === 401) {
                this.setToken(null);
            }
            throw new Error('API Error: ' + resp.status);
        }
        return resp.json();
    },

    async post(url, body) {
        var resp = await fetch(API_BASE + url, {
            method: 'POST',
            headers: this._getHeaders('application/json'),
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            if (resp.status === 401) {
                this.setToken(null);
            }
            var err = await resp.json().catch(function(){ return {error: 'Request failed'}; });
            throw new Error(err.error || 'API Error: ' + resp.status);
        }
        return resp.json();
    },

    async put(url, body) {
        var resp = await fetch(API_BASE + url, {
            method: 'PUT',
            headers: this._getHeaders('application/json'),
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            if (resp.status === 401) {
                this.setToken(null);
            }
            var err = await resp.json().catch(function(){ return {error: 'Request failed'}; });
            throw new Error(err.error || 'API Error: ' + resp.status);
        }
        return resp.json();
    },

    async delete(url) {
        var resp = await fetch(API_BASE + url, {
            method: 'DELETE',
            headers: this._getHeaders()
        });
        if (!resp.ok) {
            if (resp.status === 401) {
                this.setToken(null);
            }
            var err = await resp.json().catch(function(){ return {error: 'Request failed'}; });
            throw new Error(err.error || 'API Error: ' + resp.status);
        }
        return resp.json();
    },

    // ===== 认证 =====
    login: function(username, password) {
        var self = this;
        return this.post('/api/auth/login', { username: username, password: password }).then(function(result) {
            self.setToken(result.token);
            localStorage.setItem('current_user', JSON.stringify(result.user));
            return result;
        });
    },

    register: function(username, password, email) {
        return this.post('/api/auth/register', { username: username, password: password, email: email });
    },

    logout: function() {
        var self = this;
        return this.post('/api/auth/logout', {}).catch(function(){}).then(function() {
            self.setToken(null);
            localStorage.removeItem('current_user');
        });
    },

    getCurrentUser: function() {
        var cached = localStorage.getItem('current_user');
        if (cached) {
            try { return JSON.parse(cached); } catch(e) {}
        }
        return null;
    },

    isAdmin: function() {
        var user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    isLoggedIn: function() {
        return !!this.getToken();
    },

    fetchCurrentUser: function() {
        var self = this;
        return this.get('/api/auth/me').then(function(result) {
            localStorage.setItem('current_user', JSON.stringify(result.user));
            return result.user;
        }).catch(function() {
            self.setToken(null);
            localStorage.removeItem('current_user');
            return null;
        });
    },

    // ===== 统计 =====
    getStats: function() { return this.get('/api/stats'); },
    getDashboardData: function() { return this.get('/api/stats/dashboard'); },
    getStatusDist: function() { return this.get('/api/stats/status-dist'); },
    getTypeDist: function() { return this.get('/api/stats/type-dist'); },
    getLifecycleTrend: function() { return this.get('/api/stats/lifecycle-trend'); },
    getRecyclingTrend: function() { return this.get('/api/stats/recycling-trend'); },
    getEnterpriseDist: function() { return this.get('/api/stats/enterprise-dist'); },
    getRegionDist: function() { return this.get('/api/stats/region-dist'); },

    // ===== 电池 =====
    getBatteries: function() { return this.get('/api/batteries'); },
    getBattery: function(id) { return this.get('/api/batteries/' + id); },
    registerBattery: function(data) { return this.post('/api/batteries', data); },
    updateBatteryStatus: function(id, status) { return this.put('/api/batteries/' + id + '/status', { status: status }); },
    updateBatterySOH: function(id, soh, soc, cycles, operator, remark) { return this.put('/api/batteries/' + id + '/soh', { soh: soh, soc: soc, cycles: cycles, operator: operator, remark: remark }); },

    // ===== 生命周期事件 =====
    getEvents: function(batteryId) { return this.get('/api/events/' + batteryId); },
    addEvent: function(data) { return this.post('/api/events', data); },
    verifyEvent: function(eventId, dataHash) { return this.post('/api/events/verify', { event_id: eventId, data_hash: dataHash }); },

    // ===== 异常 =====
    getAnomalies: function() { return this.get('/api/anomalies'); },
    updateAnomalyStatus: function(id, status) { return this.put('/api/anomalies/' + id + '/status', { status: status }); },
    createAnomaly: function(data) { return this.post('/api/anomalies', data); },

    // ===== 回收 =====
    getRecyclingTasks: function() { return this.get('/api/recycling'); },
    createRecycleTask: function(data) { return this.post('/api/recycling', data); },
    advanceRecycleStage: function(id) { return this.put('/api/recycling/' + id + '/advance', {}); },

    // ===== 企业 =====
    getEnterprises: function() { return this.get('/api/enterprises'); },
    registerEnterprise: function(data) { return this.post('/api/enterprises', data); },
    verifyEnterprise: function(id) { return this.put('/api/enterprises/' + id + '/verify', {}); },

    // ===== 交易 =====
    getTransactions: function(limit) { return this.get('/api/transactions' + (limit ? '?limit=' + limit : '')); },

    // ===== 合约与角色 =====
    getContracts: function() { return this.get('/api/contracts'); },
    getRoles: function() { return this.get('/api/roles'); },

    // ===== 高级搜索 =====
    searchBatteries: function(params) {
        var qs = [];
        for (var k in params) { if (params[k]) qs.push(k + '=' + encodeURIComponent(params[k])); }
        return this.get('/api/search' + (qs.length ? '?' + qs.join('&') : ''));
    },
    getSearchFilters: function() { return this.get('/api/search/filters'); },

    // ===== 维护管理 =====
    getMaintenanceRecords: function(batteryId) {
        return this.get('/api/maintenance' + (batteryId ? '?battery_id=' + batteryId : ''));
    },
    addMaintenanceRecord: function(data) { return this.post('/api/maintenance', data); },
    updateMaintenanceRecord: function(id, data) { return this.put('/api/maintenance/' + id, data); },
    getUpcomingMaintenance: function() { return this.get('/api/maintenance/upcoming'); },

    // ===== 碳减排 =====
    getCarbonRecords: function(batteryId) {
        return this.get('/api/carbon' + (batteryId ? '?battery_id=' + batteryId : ''));
    },
    getCarbonStats: function() { return this.get('/api/carbon/stats'); },
    addCarbonRecord: function(data) { return this.post('/api/carbon', data); },

    // ===== 审计日志 =====
    getAuditLogs: function(params) {
        var qs = [];
        for (var k in params) { if (params[k]) qs.push(k + '=' + encodeURIComponent(params[k])); }
        return this.get('/api/audit' + (qs.length ? '?' + qs.join('&') : ''));
    },
    getAuditStats: function() { return this.get('/api/audit/stats'); },

    // ===== 证书 =====
    getCertificates: function(batteryId) {
        return this.get('/api/certificates' + (batteryId ? '?battery_id=' + batteryId : ''));
    },
    issueCertificate: function(data) { return this.post('/api/certificates', data); },
    revokeCertificate: function(id) { return this.put('/api/certificates/' + id + '/revoke', {}); },
    verifyCertificate: function(certNumber) { return this.get('/api/certificates/verify/' + certNumber); },

    // ===== 健康预测 =====
    getBatteryPrediction: function(id) { return this.get('/api/batteries/' + id + '/prediction'); },

    // ===== 数据导出 =====
    getExportUrl: function(type, format, batteryId) {
        var url = '/api/export/' + type + '?format=' + (format || 'json');
        if (batteryId) url += '&battery_id=' + batteryId;
        return url;
    },

    // ===== 预警中心 =====
    getAlerts: function(params) {
        var qs = [];
        for (var k in params) { if (params[k]) qs.push(k + '=' + encodeURIComponent(params[k])); }
        return this.get('/api/alerts' + (qs.length ? '?' + qs.join('&') : ''));
    },
    getAlertSummary: function() { return this.get('/api/alerts/summary'); },

    // ===== 梯次利用 =====
    getCascadeRecords: function(batteryId, status) {
        var qs = [];
        if (batteryId) qs.push('battery_id=' + batteryId);
        if (status) qs.push('status=' + status);
        return this.get('/api/cascade' + (qs.length ? '?' + qs.join('&') : ''));
    },
    getCascadeStats: function() { return this.get('/api/cascade/stats'); },
    addCascadeRecord: function(data) { return this.post('/api/cascade', data); },
    advanceCascade: function(id) { return this.put('/api/cascade/' + id + '/advance', {}); },
    updateCascadeRecord: function(id, data) { return this.put('/api/cascade/' + id, data); },

    // ===== 报告中心 =====
    getTraceabilityReport: function(batteryId) { return this.get('/api/reports/traceability/' + batteryId); },
    getHealthReport: function(batteryId) { return this.get('/api/reports/health/' + batteryId); },
    getRecyclingReport: function(batteryId) { return this.get('/api/reports/recycling/' + batteryId); },
    getCarbonReport: function(startDate, endDate) {
        var qs = [];
        if (startDate) qs.push('start_date=' + startDate);
        if (endDate) qs.push('end_date=' + endDate);
        return this.get('/api/reports/carbon' + (qs.length ? '?' + qs.join('&') : ''));
    },

    // ===== 数据导入 =====
    importBatteries: function(data, operator) { return this.post('/api/import/batteries', { data: data, operator: operator }); },
    getImportTemplate: function() { return this.get('/api/import/template'); },
    getImportLogs: function() { return this.get('/api/import/logs'); },
    deleteImportLog: function(id) { return this.delete('/api/import/logs/' + id); },
    clearImportLogs: function() { return this.delete('/api/import/logs'); },
    getSampleCsvUrl: function(count) { return '/api/import/sample-csv?count=' + (count || 10); },
    getSampleJson: function(count) { return this.get('/api/import/sample-json?count=' + (count || 10)); },

    // ===== 二维码 =====
    getQrCodeUrl: function(batteryId) { return '/api/qrcode/battery/' + batteryId; },
    getQrCodeData: function(batteryId) { return this.get('/api/qrcode/battery/' + batteryId + '/data'); }
};
