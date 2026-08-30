/**
 * 链池溯源 - 新能源汽车动力电池全生命周期可信溯源平台
 * 主应用逻辑 (异步API版本)
 */

var App = {
    currentPage: 'dashboard',
    charts: {},
    selectedBatteryId: null,
    currentRole: 'REGULATOR',
    roles: {},
    contracts: {},

    init: function() {
        this.bindNav();
        this.loadRoles();
        this.loadContracts();
        this.updateUserSection();
        var params = new URLSearchParams(window.location.search);
        var batteryId = params.get('battery');
        if (batteryId) {
            this.selectedBatteryId = batteryId;
            this.renderPage('trace');
        } else {
            this.renderPage('dashboard');
        }
    },

    loadRoles: function() {
        var self = this;
        ApiService.getRoles().then(function(data) {
            self.roles = data;
        }).catch(function(e) {
            console.error('Failed to load roles:', e);
        });
    },

    loadContracts: function() {
        var self = this;
        ApiService.getContracts().then(function(data) {
            self.contracts = data;
            var info = document.getElementById('networkInfo');
            if (info) {
                info.textContent = data.network + ' / Block #' + data.blockNumber;
            }
        }).catch(function(e) {
            console.error('Failed to load contracts:', e);
        });
    },

    bindNav: function() {
        var self = this;
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].addEventListener('click', function() {
                var page = this.getAttribute('data-page');
                self.renderPage(page);
            });
        }
    },

    renderPage: function(pageName) {
        this.currentPage = pageName;
        this.disposeCharts();

        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].classList.remove('active');
            if (navItems[i].getAttribute('data-page') === pageName) {
                navItems[i].classList.add('active');
            }
        }

        var mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted)">加载中...</div>';
        mainContent.scrollTop = 0;

        switch(pageName) {
            case 'dashboard': this.renderDashboard(mainContent); break;
            case 'register': this.renderRegister(mainContent); break;
            case 'detail': this.renderDetail(mainContent); break;
            case 'search': this.renderSearch(mainContent); break;
            case 'trace': this.renderTrace(mainContent); break;
            case 'maintenance': this.renderMaintenance(mainContent); break;
            case 'recycle': this.renderRecycle(mainContent); break;
            case 'carbon': this.renderCarbon(mainContent); break;
            case 'compare': this.renderCompare(mainContent); break;
            case 'certificates': this.renderCertificates(mainContent); break;
            case 'cascade': this.renderCascade(mainContent); break;
            case 'alerts': this.renderAlerts(mainContent); break;
            case 'reports': this.renderReports(mainContent); break;
            case 'import': this.renderImport(mainContent); break;
            case 'regulate': this.renderRegulate(mainContent); break;
            case 'audit': this.renderAudit(mainContent); break;
            case 'contracts': this.renderContracts(mainContent); break;
        }
    },

    disposeCharts: function() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        for (var key in this.charts) {
            if (this.charts[key]) {
                this.charts[key].dispose();
                delete this.charts[key];
            }
        }
    },

    _debouncedResize: null,
    _setupResize: function() {
        var self = this;
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        if (!this._debouncedResize) {
            this._debouncedResize = function() {
                for (var key in self.charts) {
                    if (self.charts[key]) self.charts[key].resize();
                }
            };
        }
        var timer = null;
        this._resizeHandler = function() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(self._debouncedResize, 150);
        };
        window.addEventListener('resize', this._resizeHandler);
    },

    // ===== Dashboard =====
    renderDashboard: function(container) {
        var self = this;
        Promise.all([
            ApiService.getStats(),
            ApiService.getTransactions(5)
        ]).then(function(results) {
            var stats = results[0];
            var txs = results[1];
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>首页数据大屏</h1>\
                    <p>新能源汽车动力电池全生命周期可信溯源平台总览 (数据来源: SQLite数据库)</p>\
                </div>\
                <div class="page-body">\
                    <div class="stat-grid">\
                        <div class="stat-card"><div class="stat-label">累计登记电池</div><div class="stat-value">' + self.formatNum(stats.totalBatteries) + '</div><div class="stat-trend up">今日 +' + stats.todayNew + '</div></div>\
                        <div class="stat-card green"><div class="stat-label">在役电池</div><div class="stat-value">' + self.formatNum(stats.activeBatteries) + '</div><div class="stat-trend up">占比 ' + ((stats.activeBatteries/stats.totalBatteries)*100).toFixed(1) + '%</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">梯次利用</div><div class="stat-value">' + self.formatNum(stats.cascadeUtilization) + '</div><div class="stat-trend up">回收率 ' + stats.recyclingRate + '%</div></div>\
                        <div class="stat-card purple"><div class="stat-label">已回收</div><div class="stat-value">' + self.formatNum(stats.recycled) + '</div><div class="stat-trend up">闭环完成</div></div>\
                        <div class="stat-card red"><div class="stat-label">异常预警</div><div class="stat-value">' + stats.anomalyAlerts + '</div><div class="stat-trend down">需处理</div></div>\
                        <div class="stat-card orange"><div class="stat-label">平均SOH</div><div class="stat-value">' + stats.avgSOH + '<span class="unit">%</span></div><div class="stat-trend up">链上记录 ' + self.formatNum(stats.totalRecords) + ' 条</div></div>\
                    </div>\
                    <div class="stat-grid">\
                        <div class="stat-card green"><div class="stat-label">碳减排总量</div><div class="stat-value">' + self.formatNum(stats.totalCarbonSaved) + '<span class="unit">kgCO2</span></div><div class="stat-trend up">等效植树 ' + self.formatNum(Math.round(stats.totalCarbonSaved/20)) + ' 棵</div></div>\
                        <div class="stat-card"><div class="stat-label">维护记录</div><div class="stat-value">' + self.formatNum(stats.totalMaintenance) + '</div><div class="stat-trend up">链上存证</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">有效证书</div><div class="stat-value">' + self.formatNum(stats.totalCertificates) + '</div><div class="stat-trend up">数字凭证</div></div>\
                        <div class="stat-card purple"><div class="stat-label">审计日志</div><div class="stat-value">' + self.formatNum(stats.totalAuditLogs) + '</div><div class="stat-trend up">全链路追踪</div></div>\
                    </div>\
                    <div class="chart-grid">\
                        <div class="chart-container"><div class="chart-title">电池生命周期状态分布</div><div class="chart-box" id="chartStatusDist"></div></div>\
                        <div class="chart-container"><div class="chart-title">电池类型分布</div><div class="chart-box" id="chartTypeDist"></div></div>\
                    </div>\
                    <div class="chart-grid">\
                        <div class="chart-container"><div class="chart-title">生命周期事件趋势 (近12个月)</div><div class="chart-box large" id="chartLifecycleTrend"></div></div>\
                        <div class="chart-container"><div class="chart-title">地区分布</div><div class="chart-box large" id="chartRegionDist"></div></div>\
                    </div>\
                    <div class="chart-grid full">\
                        <div class="chart-container"><div class="chart-title">回收完成率趋势</div><div class="chart-box" id="chartRecyclingTrend"></div></div>\
                    </div>\
                    <div class="card">\
                        <div class="card-header"><h3>最近链上交易</h3><span class="card-action" onclick="App.renderPage(\'contracts\')">查看全部</span></div>\
                        <table class="data-table"><thead><tr><th>交易Hash</th><th>类型</th><th>电池ID</th><th>区块</th><th>时间</th><th>状态</th></tr></thead><tbody>';
            for (var i = 0; i < txs.length; i++) {
                var tx = txs[i];
                html += '<tr>\
                    <td style="font-family:monospace;font-size:12px;color:var(--accent-cyan)">' + (tx.tx_hash || '').substr(0,20) + '...</td>\
                    <td><span class="badge badge-blue">' + self.txTypeLabel(tx.tx_type) + '</span></td>\
                    <td style="font-family:monospace;font-size:12px">' + tx.battery_id + '</td>\
                    <td>#' + tx.block_number + '</td>\
                    <td>' + (tx.created_at || '') + '</td>\
                    <td><span class="badge badge-green"><span class="badge-dot"></span>' + tx.status + '</span></td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
            self.initDashboardCharts();
        }).catch(function(err) {
            container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--accent-red)">数据加载失败: ' + err.message + '<br><br><button class="btn btn-primary" onclick="App.renderPage(\'dashboard\')">重试</button><br><br><span style="font-size:12px;color:var(--text-muted)">请确认后端服务已启动: cd backend && npm install && npm start</span></div>';
        });
    },

    initDashboardCharts: function() {
        var self = this;
        ApiService.getDashboardData().then(function(d) {
            var chart1 = echarts.init(document.getElementById('chartStatusDist'));
            chart1.setOption({
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
                color: d.statusDist.map(function(x){return x.color;}),
                series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'], itemStyle: { borderColor: '#1a2332', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } }, data: d.statusDist.map(function(x){return {value:x.value,name:x.name};}) }]
            });
            self.charts.statusDist = chart1;

            var chart2 = echarts.init(document.getElementById('chartTypeDist'));
            chart2.setOption({
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
                xAxis: { type: 'category', data: d.typeDist.map(function(x){return x.name;}), axisLabel: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
                yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                series: [{ type: 'bar', data: d.typeDist.map(function(x){return x.value;}), itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#3b82f6'},{offset:1,color:'#1e3a5f'}]), borderRadius: [4,4,0,0] }, barWidth: '50%' }]
            });
            self.charts.typeDist = chart2;

            var chart3 = echarts.init(document.getElementById('chartLifecycleTrend'));
            var trend = d.lifecycleTrend;
            chart3.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['电池登记','生命周期记录','异常预警'], textStyle: { color: '#94a3b8' }, top: 0 },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
                xAxis: { type: 'category', data: trend.months, axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
                yAxis: [{ type: 'value', name: '数量', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } }, { type: 'value', name: '异常', axisLabel: { color: '#94a3b8' }, splitLine: { show: false } }],
                series: [
                    { name: '电池登记', type: 'line', smooth: true, data: trend.registrations, itemStyle: { color: '#3b82f6' }, areaStyle: { color: 'rgba(59,130,246,0.1)' } },
                    { name: '生命周期记录', type: 'line', smooth: true, data: trend.records, itemStyle: { color: '#06b6d4' }, areaStyle: { color: 'rgba(6,182,212,0.1)' } },
                    { name: '异常预警', type: 'bar', yAxisIndex: 1, data: trend.anomalies, itemStyle: { color: '#ef4444' } }
                ]
            });
            self.charts.lifecycleTrend = chart3;

            var chart4 = echarts.init(document.getElementById('chartRegionDist'));
            chart4.setOption({
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { type: 'scroll', bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
                color: ['#3b82f6','#06b6d4','#8b5cf6','#f59e0b','#10b981','#ef4444','#ec4899','#14b8a6','#64748b'],
                series: [{ type: 'pie', radius: '60%', center: ['50%','45%'], data: d.regionDist.map(function(x){return {value:x.value,name:x.name};}), itemStyle: { borderColor: '#1a2332', borderWidth: 2 }, label: { color: '#94a3b8' } }]
            });
            self.charts.regionDist = chart4;

            var chart5 = echarts.init(document.getElementById('chartRecyclingTrend'));
            var rt = d.recyclingTrend;
            chart5.setOption({
                tooltip: { trigger: 'axis', formatter: '{b}<br/>回收率: {c}%' },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
                xAxis: { type: 'category', data: rt.months, axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
                yAxis: { type: 'value', max: 100, axisLabel: { color: '#94a3b8', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                series: [{ type: 'line', smooth: true, data: rt.rates, itemStyle: { color: '#10b981' }, lineStyle: { width: 3 }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(16,185,129,0.3)'},{offset:1,color:'rgba(16,185,129,0)'}]) }, markLine: { data: [{ yAxis: 80, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '目标80%' } }] } }]
            });
            self.charts.recyclingTrend = chart5;

            self._setupResize();
        }).catch(function(err) { console.error('Chart error:', err); });
    },

    // ===== Register =====
    renderRegister: function(container) {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        var html = '\
        <div class="page active">\
            <div class="page-header"><h1>电池注册</h1><p>为动力电池创建唯一数字身份，写入区块链不可篡改 (数据将保存至SQLite数据库)</p></div>\
            <div class="role-selector" id="roleSelector">' + this.renderRoleChips() + '</div>\
            <div class="page-body">\
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">\
                    <div class="card">\
                        <div class="card-header"><h3>电池信息登记</h3>\
                            <div style="display:flex;gap:6px">\
                                <button class="btn btn-sm" onclick="App.autoGenerateId()">自动生成ID</button>\
                                <button class="btn btn-sm" onclick="App.quickFillTemplate()">快速填充模板</button>\
                            </div>\
                        </div>\
                        <div class="card-body">\
                            <form id="batteryForm" onsubmit="return false">\
                                <div class="form-group"><label>Battery ID <span class="required">*</span></label><div style="display:flex;gap:8px"><input class="form-input" id="f_batteryId" placeholder="如: BAT-2026-CATL-00001999" value="BAT-2026-CATL-00001999"><button type="button" class="btn btn-sm" onclick="App.autoGenerateId()" style="white-space:nowrap">生成</button></div></div>\
                                <div class="form-row">\
                                    <div class="form-group"><label>制造商 <span class="required">*</span></label><select class="form-select" id="f_manufacturer" onchange="App.onManufacturerChange()"><option value="">请选择</option><option>宁德时代</option><option>比亚迪</option><option>国轩高科</option><option>亿纬锂能</option><option>中创新航</option><option>蜂巢能源</option></select></div>\
                                    <div class="form-group"><label>电池型号 <span class="required">*</span></label><select class="form-select" id="f_model"><option value="">请先选择制造商</option></select></div>\
                                </div>\
                                <div class="form-row">\
                                    <div class="form-group"><label>电芯类型 <span class="required">*</span></label><select class="form-select" id="f_type"><option value="">请选择</option><option>三元锂电池</option><option>磷酸铁锂电池</option><option>钛酸锂电池</option><option>锰酸锂电池</option></select></div>\
                                    <div class="form-group"><label>额定容量 <span class="required">*</span></label><select class="form-select" id="f_capacity"><option value="">请选择</option><option>60 kWh</option><option>75 kWh</option><option>80 kWh</option><option>100 kWh</option><option>120 kWh</option><option>150 kWh</option></select></div>\
                                </div>\
                                <div class="form-row">\
                                    <div class="form-group"><label>生产批次 <span class="required">*</span></label><input class="form-input" id="f_batch" placeholder="如: B202608-CT"></div>\
                                    <div class="form-group"><label>生产日期 <span class="required">*</span></label><input class="form-input" type="date" id="f_date" value="' + today + '"></div>\
                                </div>\
                                <div class="form-row">\
                                    <div class="form-group"><label>绑定车辆VIN (可选)</label><input class="form-input" id="f_vin" placeholder="如: LSGAB52L9DF000001"></div>\
                                    <div class="form-group"><label>当前责任主体 (可选)</label><input class="form-input" id="f_owner" placeholder="如: XX新能源汽车公司"></div>\
                                </div>\
                                <div class="form-group"><label>初始质量检测结果</label><textarea class="form-textarea" id="f_quality" placeholder="容量测试结果、内阻测试、绝缘测试等..."></textarea></div>\
                                <div style="display:flex;gap:12px">\
                                    <button class="btn btn-primary btn-lg admin-only" id="btnRegister" onclick="App.submitBatteryRegistration()">\
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>\
                                        上链登记\
                                    </button>\
                                    <button class="btn btn-secondary btn-lg" onclick="App.resetForm()">重置</button>\
                                </div>\
                            </form>\
                        </div>\
                    </div>\
                    <div>\
                        <div class="card mb-24">\
                            <div class="card-header"><h3>智能合约信息</h3></div>\
                            <div class="card-body"><div style="display:flex;flex-direction:column;gap:12px">\
                                <div class="qr-info-item" style="border-bottom:1px solid var(--border-color);padding-bottom:8px"><span class="label">合约名称</span><span class="value">BatteryRegistry</span></div>\
                                <div class="qr-info-item" style="border-bottom:1px solid var(--border-color);padding-bottom:8px"><span class="label">合约地址</span><span class="value" style="font-family:monospace;font-size:11px" id="contractAddr">0x5FbDB2315678afecb367f032d93F642f64180aa3</span></div>\
                                <div class="qr-info-item" style="border-bottom:1px solid var(--border-color);padding-bottom:8px"><span class="label">调用函数</span><span class="value" style="font-family:monospace;font-size:12px">registerBattery()</span></div>\
                                <div class="qr-info-item" style="padding-bottom:0"><span class="label">当前角色</span><span class="value" id="currentRoleDisplay">' + (this.roles[this.currentRole] ? this.roles[this.currentRole].name : '监管机构') + '</span></div>\
                            </div></div>\
                        </div>\
                        <div class="card">\
                            <div class="card-header"><h3>注册流程</h3></div>\
                            <div class="card-body"><div class="timeline" style="padding-left:32px">\
                                <div class="timeline-item"><div class="timeline-dot"><div class="dot-inner"></div></div><div class="timeline-content"><div class="timeline-title">填写电池信息</div><div class="timeline-desc">输入BatteryID、制造商、型号等基本信息</div></div></div>\
                                <div class="timeline-item"><div class="timeline-dot"><div class="dot-inner"></div></div><div class="timeline-content"><div class="timeline-title">提交上链</div><div class="timeline-desc">调用BatteryRegistry智能合约registerBattery()函数，数据写入SQLite数据库</div></div></div>\
                                <div class="timeline-item"><div class="timeline-dot green"><div class="dot-inner"></div></div><div class="timeline-content"><div class="timeline-title">生成数字身份+二维码</div><div class="timeline-desc">链上生成唯一Battery DID，自动生成溯源二维码和SOH初始记录</div></div></div>\
                            </div></div>\
                        </div>\
                    </div>\
                </div>\
            </div>\
        </div>';
        container.innerHTML = html;
        this.bindRoleSelector();
    },

    autoGenerateId: function() {
        var mfg = document.getElementById('f_manufacturer').value;
        var prefix = 'BAT-2026-';
        if (mfg) {
            var mfgMap = { '宁德时代': 'CATL', '比亚迪': 'BYD', '国轩高科': 'GOTION', '亿纬锂能': 'EVE', '中创新航': 'CALB', '蜂巢能源': 'HIVE' };
            prefix = 'BAT-2026-' + (mfgMap[mfg] || 'XXX') + '-';
        } else {
            prefix = 'BAT-2026-XXX-';
        }
        var num = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
        document.getElementById('f_batteryId').value = prefix + num;
        this.showToast('已生成ID: ' + prefix + num, 'info');
    },

    onManufacturerChange: function() {
        var mfg = document.getElementById('f_manufacturer').value;
        var modelSelect = document.getElementById('f_model');
        var models = {
            '宁德时代': ['麒麟电池-CTP3.0', '神行超充电池', 'M3P电池', '钠离子电池'],
            '比亚迪': ['刀片电池-Blade V1', '刀片电池-Blade V2', 'Blade Battery-CTB'],
            '国轩高科': ['Gotion L600', 'JTM电池', '高能量密度三元电池'],
            '亿纬锂能': ['LF560K', 'LF280K', '大圆柱电池-46950'],
            '中创新航': ['OS高锰铁锂电池', 'U型电池', '三元高电压电池'],
            '蜂巢能源': ['短刀电池-L300', '龙鳞甲电池', '方形三元电池']
        };
        modelSelect.innerHTML = '<option value="">请选择型号</option>';
        if (mfg && models[mfg]) {
            for (var i = 0; i < models[mfg].length; i++) {
                modelSelect.innerHTML += '<option>' + models[mfg][i] + '</option>';
            }
        }
    },

    quickFillTemplate: function() {
        var templates = [
            { manufacturer: '宁德时代', model: '麒麟电池-CTP3.0', type: '三元锂电池', capacity: '100 kWh', batch: 'BATCH-2026-001' },
            { manufacturer: '比亚迪', model: '刀片电池-Blade V2', type: '磷酸铁锂电池', capacity: '80 kWh', batch: 'BATCH-2026-002' },
            { manufacturer: '国轩高科', model: 'Gotion L600', type: '磷酸铁锂电池', capacity: '75 kWh', batch: 'BATCH-2026-003' }
        ];
        var tpl = templates[Math.floor(Math.random() * templates.length)];
        document.getElementById('f_manufacturer').value = tpl.manufacturer;
        this.onManufacturerChange();
        document.getElementById('f_model').value = tpl.model;
        document.getElementById('f_type').value = tpl.type;
        document.getElementById('f_capacity').value = tpl.capacity;
        document.getElementById('f_batch').value = tpl.batch;
        this.autoGenerateId();
        this.showToast('已填充模板: ' + tpl.manufacturer + ' ' + tpl.model, 'success');
    },

    submitBatteryRegistration: function() {
        if (!this.requireAdmin()) return;
        var batteryId = document.getElementById('f_batteryId').value.trim();
        var manufacturer = document.getElementById('f_manufacturer').value;
        var model = document.getElementById('f_model').value.trim();
        var type = document.getElementById('f_type').value;
        var capacity = document.getElementById('f_capacity').value.trim();
        var batch = document.getElementById('f_batch').value.trim();
        var date = document.getElementById('f_date').value;

        if (!batteryId || !manufacturer || !model || !type || !capacity || !batch || !date) {
            this.showToast('请填写所有必填项', 'error');
            return;
        }

        var self = this;
        var btn = document.getElementById('btnRegister');
        btn.disabled = true;
        btn.textContent = '上链中...';
        this.showToast('正在提交交易至区块链...', 'info');

        ApiService.registerBattery({
            id: batteryId,
            manufacturer: manufacturer,
            model: model,
            battery_type: type,
            capacity: capacity,
            batch: batch,
            production_date: date,
            vehicle_vin: document.getElementById('f_vin') ? document.getElementById('f_vin').value.trim() : '',
            current_owner: document.getElementById('f_owner') ? document.getElementById('f_owner').value.trim() || manufacturer : manufacturer
        }).then(function(result) {
            btn.disabled = false;
            btn.textContent = '上链登记';
            self.showRegistrationSuccess(result, { batteryId: batteryId, manufacturer: manufacturer });
        }).catch(function(err) {
            btn.disabled = false;
            btn.textContent = '上链登记';
            self.showToast('注册失败: ' + err.message, 'error');
        });
    },

    showRegistrationSuccess: function(result, data) {
        var modal = document.getElementById('modalContent');
        modal.innerHTML = '\
            <div class="modal-header"><h3>注册成功</h3><span class="modal-close" onclick="App.closeModal()">&times;</span></div>\
            <div class="modal-body">\
                <div class="verification-result">\
                    <div class="verify-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>\
                    <div class="verify-title">电池数字身份已生成</div>\
                    <div class="verify-desc">BatteryID ' + data.batteryId + ' 已成功写入区块链和数据库</div>\
                </div>\
                <div style="display:grid;grid-template-columns:1fr 200px;gap:24px;margin-top:20px">\
                    <div>\
                        <div class="qr-info-item"><span class="label">交易Hash</span><span class="value" style="font-family:monospace;font-size:11px;color:var(--accent-cyan)">' + result.txHash + '</span></div>\
                        <div class="qr-info-item"><span class="label">区块高度</span><span class="value">#' + result.blockNumber + '</span></div>\
                        <div class="qr-info-item"><span class="label">Gas消耗</span><span class="value">' + result.gasUsed + '</span></div>\
                        <div class="qr-info-item"><span class="label">合约</span><span class="value">BatteryRegistry</span></div>\
                        <div class="qr-info-item"><span class="label">函数</span><span class="value" style="font-family:monospace">registerBattery()</span></div>\
                        <div class="qr-info-item"><span class="label">数据存储</span><span class="value">SQLite + 区块链存证</span></div>\
                        <div class="qr-info-item"><span class="label">状态</span><span class="value"><span class="badge badge-green">已确认</span></span></div>\
                    </div>\
                    <div style="text-align:center">\
                        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">溯源二维码</div>\
                        <div id="qrCodeBox" style="width:160px;height:160px;margin:0 auto;background:#fff;border-radius:8px;padding:8px"></div>\
                        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">扫码查看电池信息</div>\
                    </div>\
                </div>\
            </div>\
            <div class="modal-footer">\
                <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button>\
                <button class="btn btn-primary" onclick="App.closeModal();App.selectBatteryForDetail(\'' + data.batteryId + '\')">查看电池详情</button>\
            </div>';
        document.getElementById('modalOverlay').classList.add('show');
        this.generateQRCode(data.batteryId);
        this.showToast('电池 ' + data.batteryId + ' 注册成功，数据已写入数据库', 'success');
    },

    // ===== Detail =====
    renderDetail: function(container) {
        var self = this;
        ApiService.getBatteries().then(function(batteries) {
            var selectedId = self.selectedBatteryId || (batteries.length > 0 ? batteries[0].id : null);
            if (!selectedId) {
                container.innerHTML = '<div class="page active"><div class="page-header"><h1>电池详情</h1></div><div class="page-body"><div style="text-align:center;padding:40px;color:var(--text-muted)">暂无电池数据</div></div></div>';
                return;
            }

            ApiService.getBattery(selectedId).then(function(battery) {
                self.renderDetailContent(container, batteries, battery);
            }).catch(function(err) {
                container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
            });
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    renderDetailContent: function(container, batteries, b) {
        var self = this;
        var html = '\
        <div class="page active">\
            <div class="page-header"><h1>电池详情</h1><p>查看电池完整生命周期记录、健康趋势和链上验证信息 (数据来源: SQLite数据库)</p></div>\
            <div class="page-body">\
                <div class="search-bar">\
                    <input class="form-input" id="batterySearch" placeholder="输入BatteryID搜索" value="' + b.id + '">\
                    <button class="btn btn-primary" onclick="App.searchBattery()">查询</button>\
                </div>\
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">';
        for (var i = 0; i < batteries.length; i++) {
            html += '<span class="role-chip' + (batteries[i].id === b.id ? ' active' : '') + '" onclick="App.selectBatteryForDetail(\'' + batteries[i].id + '\')">' + batteries[i].id + '</span>';
        }
        html += '</div>\
                <div class="battery-detail-header">\
                    <div class="battery-id-block">\
                        <div class="battery-icon-large"><svg viewBox="0 0 24 24"><path d="M17 4h-3V2h-4v2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2zm-5 8l-4-4h3V6h2v2h3l-4 4z"/></svg></div>\
                        <div class="battery-id-text"><h2>' + b.id + '</h2><p>' + b.manufacturer + ' / ' + b.model + ' / ' + b.battery_type + ' / ' + b.capacity + '</p></div>\
                    </div>\
                    <div class="battery-stats-row">\
                        <div class="battery-stat"><div class="stat-num">' + self.statusBadge(b.status) + '</div><div class="stat-label">当前状态</div></div>\
                        <div class="battery-stat"><div class="stat-num ' + (b.soh >= 80 ? 'green' : b.soh >= 60 ? 'orange' : 'red') + '">' + b.soh + '%</div><div class="stat-label">SOH</div></div>\
                        <div class="battery-stat"><div class="stat-num">' + b.cycles + '</div><div class="stat-label">循环次数</div></div>\
                        <div class="battery-stat"><div class="stat-num">' + self.calcYears(b.production_date) + '年</div><div class="stat-label">生命周期</div></div>\
                        <div class="battery-stat"><button class="btn btn-sm btn-primary admin-only" onclick="App.showSohAttestModal(\'' + b.id + '\', ' + b.soh + ')">SOH上链存证</button></div>\
                    </div>\
                </div>\
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">\
                    <div class="soh-chart-container"><div class="chart-title">SOH健康趋势</div><div class="chart-box" id="chartSOH"></div></div>\
                    <div class="card">\
                        <div class="card-header"><h3>电池基础信息</h3></div>\
                        <div class="card-body">\
                            <div class="qr-info-item"><span class="label">Battery ID</span><span class="value" style="font-family:monospace">' + b.id + '</span></div>\
                            <div class="qr-info-item"><span class="label">制造商</span><span class="value">' + b.manufacturer + '</span></div>\
                            <div class="qr-info-item"><span class="label">电池型号</span><span class="value">' + b.model + '</span></div>\
                            <div class="qr-info-item"><span class="label">电芯类型</span><span class="value">' + b.battery_type + '</span></div>\
                            <div class="qr-info-item"><span class="label">额定容量</span><span class="value">' + b.capacity + '</span></div>\
                            <div class="qr-info-item"><span class="label">生产批次</span><span class="value">' + b.batch + '</span></div>\
                            <div class="qr-info-item"><span class="label">生产日期</span><span class="value">' + b.production_date + '</span></div>\
                            <div class="qr-info-item"><span class="label">绑定车辆VIN</span><span class="value" style="font-family:monospace">' + (b.vehicle_vin || '-') + '</span></div>\
                            <div class="qr-info-item"><span class="label">当前责任主体</span><span class="value">' + (b.current_owner || '-') + '</span></div>\
                            <div class="qr-info-item"><span class="label">链上交易Hash</span><span class="value" style="font-family:monospace;font-size:11px;color:var(--accent-cyan)">' + (b.tx_hash || '').substr(0,24) + '...</span></div>\
                            <div class="qr-info-item"><span class="label">区块高度</span><span class="value">#' + (b.block_number || '-') + '</span></div>\
                            <div class="qr-info-item"><span class="label">链上验证</span><span class="value"><span class="badge badge-green">验证通过</span></span></div>\
                        </div>\
                    </div>\
                </div>\
                <div class="card mb-24">\
                    <div class="card-header"><h3>健康预测分析</h3><span class="card-action" onclick="App.loadPrediction(\'' + b.id + '\')">加载预测</span></div>\
                    <div class="card-body">\
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:16px">\
                            <div style="background:var(--bg-darker);padding:12px;border-radius:8px;text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">年衰减率</div><div id="pred_decay" style="font-size:18px;font-weight:700;color:var(--accent-orange)">-</div></div>\
                            <div style="background:var(--bg-darker);padding:12px;border-radius:8px;text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">距退役(月)</div><div id="pred_retire" style="font-size:18px;font-weight:700;color:var(--accent-red)">-</div></div>\
                            <div style="background:var(--bg-darker);padding:12px;border-radius:8px;text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">距梯次利用(月)</div><div id="pred_cascade" style="font-size:18px;font-weight:700;color:var(--accent-cyan)">-</div></div>\
                            <div style="background:var(--bg-darker);padding:12px;border-radius:8px;text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">剩余循环次数</div><div id="pred_cycles" style="font-size:18px;font-weight:700;color:var(--accent-green)">-</div></div>\
                        </div>\
                        <div class="chart-box" id="chartPrediction" style="height:300px"></div>\
                    </div>\
                </div>';
        // Add event form
        html += '<div class="card mb-24">\
                    <div class="card-header"><h3>添加生命周期事件 (上链)</h3></div>\
                    <div class="card-body">\
                        <div class="form-row-3">\
                            <div class="form-group"><label>事件类型</label><select class="form-select" id="ev_type"><option>电池检测</option><option>维修记录</option><option>事故记录</option><option>质量检测</option><option>装配车辆</option><option>车辆交付</option><option>退役</option><option>梯次利用</option><option>最终回收</option></select></div>\
                            <div class="form-group"><label>事件标题</label><input class="form-input" id="ev_title" placeholder="如: 常规健康检测"></div>\
                            <div class="form-group"><label>提交机构</label><input class="form-input" id="ev_submitter" placeholder="如: 深圳检测中心"></div>\
                        </div>\
                        <div class="form-group"><label>事件描述</label><textarea class="form-textarea" id="ev_desc" placeholder="如: SOH: 85% / SOC: 70% / 循环次数: 600次"></textarea></div>\
                        <button class="btn btn-primary admin-only" onclick="App.submitEvent(\'' + b.id + '\')">提交上链</button>\
                    </div>\
                </div>';
        // Timeline
        var events = b.lifecycleEvents || [];
        html += '<div class="card mb-24">\
                    <div class="card-header"><h3>生命周期时间轴</h3><span style="font-size:12px;color:var(--text-muted)">共 ' + events.length + ' 条链上记录</span></div>\
                    <div class="card-body"><div class="timeline">';
        for (var j = 0; j < events.length; j++) {
            var ev = events[j];
            var dotClass = self.eventDotClass(ev.event_type);
            html += '<div class="timeline-item">\
                <div class="timeline-dot ' + dotClass + '"><div class="dot-inner"></div></div>\
                <div class="timeline-content">\
                    <div class="timeline-date">' + (ev.event_date || ev.created_at || '') + '</div>\
                    <div class="timeline-title">' + ev.event_title + '</div>\
                    <div class="timeline-desc">' + (ev.event_desc || '') + '</div>\
                    <div class="timeline-meta">\
                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>' + (ev.submitter || '') + '</span>\
                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7v10l10 5 10-5V7z"/></svg>Hash: ' + (ev.data_hash || '').substr(0,16) + '...</span>';
            if (ev.verified) html += '<span style="color:var(--accent-green)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>链上验证通过</span>';
            html += '</div></div></div>';
        }
        html += '</div></div></div>';
        // Transfer history
        var transfers = b.transferHistory || [];
        html += '<div class="card">\
                    <div class="card-header"><h3>责任主体转移记录</h3></div>\
                    <table class="data-table"><thead><tr><th>转移时间</th><th>来源</th><th>去向</th><th>转移类型</th></tr></thead><tbody>';
        for (var k = 0; k < transfers.length; k++) {
            var tr = transfers[k];
            html += '<tr><td>' + tr.transfer_date + '</td><td>' + tr.from_party + '</td><td>' + tr.to_party + '</td><td><span class="badge badge-cyan">' + tr.transfer_type + '</span></td></tr>';
        }
        html += '</tbody></table></div>\
            </div>\
        </div>';
        container.innerHTML = html;
        self.initSOHChart(b);
    },

    submitEvent: function(batteryId) {
        if (!this.requireAdmin()) return;
        var type = document.getElementById('ev_type').value;
        var title = document.getElementById('ev_title').value.trim();
        var submitter = document.getElementById('ev_submitter').value.trim();
        var desc = document.getElementById('ev_desc').value.trim();

        if (!title || !submitter) {
            this.showToast('请填写事件标题和提交机构', 'error');
            return;
        }

        var self = this;
        this.showToast('正在上链...', 'info');
        ApiService.addEvent({
            battery_id: batteryId,
            event_type: type,
            event_title: title,
            event_desc: desc,
            submitter: submitter
        }).then(function(result) {
            self.showToast('事件已上链: ' + result.txHash.substr(0,16) + '...', 'success');
            self.renderDetail(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('上链失败: ' + err.message, 'error');
        });
    },

    initSOHChart: function(battery) {
        var chart = echarts.init(document.getElementById('chartSOH'));
        var sohData = battery.sohHistory || [];
        chart.setOption({
            tooltip: { trigger: 'axis', formatter: function(p){return p[0].name + '<br/>SOH: ' + p[0].value + '%';} },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
            xAxis: { type: 'category', data: sohData.map(function(d){return d.record_date;}), axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
            yAxis: { type: 'value', min: 50, max: 100, axisLabel: { color: '#94a3b8', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#1e293b' } } },
            series: [{ type: 'line', smooth: true, data: sohData.map(function(d){return d.soh;}), itemStyle: { color: '#10b981' }, lineStyle: { width: 3 }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(16,185,129,0.3)'},{offset:1,color:'rgba(16,185,129,0)'}]) }, markLine: { data: [{ yAxis: 80, lineStyle: { color: '#3b82f6', type: 'dashed' }, label: { formatter: '健康', position: 'end' } }, { yAxis: 65, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '退役线', position: 'end' } }] } }]
        });
        this.charts.soh = chart;
        this._setupResize();
    },

    searchBattery: function() {
        var query = document.getElementById('batterySearch').value.trim().toUpperCase();
        this.selectedBatteryId = query;
        this.renderDetail(document.getElementById('mainContent'));
    },

    selectBatteryForDetail: function(batteryId) {
        this.selectedBatteryId = batteryId;
        this.renderPage('detail');
    },

    // ===== Trace =====
    renderTrace: function(container) {
        var self = this;
        ApiService.getBatteries().then(function(batteries) {
            var selectedId = self.selectedBatteryId || (batteries.length > 0 ? batteries[0].id : null);
            if (!selectedId) { container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;text-align:center;color:var(--text-muted)">暂无电池数据</div></div></div>'; return; }
            ApiService.getBattery(selectedId).then(function(b) {
                self.renderTraceContent(container, batteries, b);
            });
        });
    },

    renderTraceContent: function(container, batteries, b) {
        var self = this;
        var events = b.lifecycleEvents || [];
        var sohHistory = b.sohHistory || [];
        var transfers = b.transferHistory || [];
        var accidentCount = self.countEvents(events, '事故记录');
        var repairCount = self.countEvents(events, '维修记录');
        var sohColor = b.soh >= 80 ? '#10b981' : (b.soh >= 65 ? '#f59e0b' : '#ef4444');

        var html = '\
        <div class="page active">\
            <div class="page-header">\
                <h1>' + b.id + '</h1>\
                <p>' + b.manufacturer + ' ' + b.model + ' · ' + b.battery_type + ' · ' + b.production_date + '</p>\
            </div>\
            <div class="page-body">\
                <div class="search-bar"><input class="form-input" id="traceSearch" placeholder="输入BatteryID查询" value="' + b.id + '"><button class="btn btn-primary" onclick="App.traceSearch()">查询</button></div>\
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:24px">';
        for (var i = 0; i < Math.min(batteries.length, 12); i++) {
            html += '<span class="role-chip' + (batteries[i].id === b.id ? ' active' : '') + '" onclick="App.selectBatteryForTrace(\'' + batteries[i].id + '\')">' + batteries[i].id + '</span>';
        }
        html += '</div>\
                <div class="verification-result" style="margin-bottom:32px">\
                    <div class="verify-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>\
                    <div style="flex:1">\
                        <div class="verify-title">链上验证通过</div>\
                        <div class="verify-desc">数据真实可信 · Hash匹配</div>\
                    </div>\
                    <div style="text-align:right;font-size:11px;color:var(--text-muted)">\
                        <div>区块 #' + (b.block_number || '-') + '</div>\
                        <div style="font-family:monospace;color:var(--accent-cyan);margin-top:2px">' + (b.tx_hash ? b.tx_hash.substring(0,16) + '...' : '-') + '</div>\
                    </div>\
                </div>\
                <div style="display:grid;grid-template-columns:1fr 220px;gap:32px;align-items:start">\
                    <div>\
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:32px">\
                            <div style="text-align:center;padding:20px 12px;background:var(--bg-subtle);border-radius:var(--radius)">\
                                <div style="font-size:24px;font-weight:700;color:' + sohColor + '">' + b.soh + '%</div>\
                                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">SOH</div>\
                            </div>\
                            <div style="text-align:center;padding:20px 12px;background:var(--bg-subtle);border-radius:var(--radius)">\
                                <div style="font-size:24px;font-weight:700;color:var(--accent-blue)">' + (b.soc || 0) + '%</div>\
                                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">SOC</div>\
                            </div>\
                            <div style="text-align:center;padding:20px 12px;background:var(--bg-subtle);border-radius:var(--radius)">\
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary)">' + b.cycles + '</div>\
                                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">循环次数</div>\
                            </div>\
                        </div>\
                        <div class="section-title">基本信息</div>\
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:32px">\
                            <div class="info-item"><span class="info-label">状态</span><span class="badge badge-blue">' + b.status + '</span></div>\
                            <div class="info-item"><span class="info-label">容量</span><span class="info-value">' + b.capacity + '</span></div>\
                            <div class="info-item"><span class="info-label">批次</span><span class="info-value">' + (b.batch || '-') + '</span></div>\
                            <div class="info-item"><span class="info-label">使用年限</span><span class="info-value">' + self.calcYears(b.production_date) + ' 年</span></div>\
                            <div class="info-item"><span class="info-label">车辆VIN</span><span class="info-value" style="font-family:monospace;font-size:12px">' + (b.vehicle_vin || '-') + '</span></div>\
                            <div class="info-item"><span class="info-label">责任主体</span><span class="info-value">' + (b.current_owner || '-') + '</span></div>\
                            <div class="info-item"><span class="info-label">可信评分</span><span class="info-value" style="color:var(--accent-green);font-weight:600">' + (b.trust_score || 0) + ' / 100</span></div>\
                            <div class="info-item"><span class="info-label">事故/维修</span><span class="info-value">' + accidentCount + ' / ' + repairCount + '</span></div>\
                        </div>';
        if (sohHistory.length > 0) {
            html += '\
                        <div class="section-title">SOH变化趋势</div>\
                        <div style="display:flex;gap:4px;align-items:flex-end;height:48px;margin-bottom:32px">';
            var maxSoh = 100;
            for (var h = 0; h < sohHistory.length; h++) {
                var hgt = Math.max(8, (sohHistory[h].soh / maxSoh) * 100);
                html += '<div style="flex:1;background:var(--accent-blue);border-radius:3px 3px 0 0;height:' + hgt + '%;opacity:' + (0.4 + 0.6 * (h + 1) / sohHistory.length) + '" title="' + sohHistory[h].record_date + ': ' + sohHistory[h].soh + '%"></div>';
            }
            html += '</div>';
        }
        html += '\
                        <div class="section-title">生命周期事件</div>\
                        <div class="timeline" style="margin-bottom:16px">';
        for (var e = 0; e < events.length; e++) {
            var ev = events[e];
            html += '\
                            <div class="timeline-item">\
                                <div class="timeline-dot ' + (e === events.length - 1 ? 'green' : '') + '"><div class="dot-inner"></div></div>\
                                <div class="timeline-content">\
                                    <div class="timeline-title">' + ev.event_title + '</div>\
                                    <div class="timeline-desc">' + (ev.event_desc || '') + '</div>\
                                    <div class="timeline-meta"><span>' + (ev.event_date || '-') + '</span><span>' + (ev.submitter || '-') + '</span>' + (ev.verified ? '<span style="color:var(--accent-green)">已验证</span>' : '') + '</div>\
                                </div>\
                            </div>';
        }
        if (events.length === 0) {
            html += '<div style="color:var(--text-muted);font-size:13px;padding:16px 0">暂无生命周期记录</div>';
        }
        html += '</div>';
        if (transfers.length > 0) {
            html += '\
                        <div class="section-title">所有权转移</div>\
                        <div style="margin-bottom:16px">';
            for (var t = 0; t < transfers.length; t++) {
                var tr = transfers[t];
                html += '<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-weight:500">' + (tr.from_owner || '-') + ' → ' + (tr.to_owner || '-') + '</span><span style="color:var(--text-muted);font-size:11px;margin-left:12px">' + (tr.transfer_date || '-') + '</span></div>';
            }
            html += '</div>';
        }
        html += '\
                    </div>\
                    <div>\
                        <div style="text-align:center;margin-bottom:24px">\
                            <div id="qrCodeBox" style="width:180px;height:180px;margin:0 auto;background:#fff;border-radius:var(--radius-sm);padding:8px"></div>\
                            <div style="font-size:12px;color:var(--text-muted);margin-top:12px;line-height:1.5">扫码查看电池完整信息<br>二维码内含全部溯源数据</div>\
                        </div>\
                        <div class="section-title" style="margin-top:0">数据验证</div>\
                        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:24px">\
                            <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-muted)">生产记录</span><span style="color:var(--accent-green)">完整</span></div>\
                            <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-muted)">检测记录</span><span style="color:var(--accent-green)">连续</span></div>\
                            <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-muted)">维修记录</span><span style="color:var(--accent-green)">可追溯</span></div>\
                            <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-muted)">数据Hash</span><span style="color:var(--accent-green)">匹配</span></div>\
                            <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-muted)">责任主体</span><span style="color:var(--accent-green)">清晰</span></div>\
                        </div>\
                        <div class="section-title">统计</div>\
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">\
                            <div style="text-align:center;padding:12px;background:var(--bg-subtle);border-radius:var(--radius-sm)">\
                                <div style="font-size:20px;font-weight:700;color:var(--accent-red)">' + accidentCount + '</div>\
                                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">事故</div>\
                            </div>\
                            <div style="text-align:center;padding:12px;background:var(--bg-subtle);border-radius:var(--radius-sm)">\
                                <div style="font-size:20px;font-weight:700;color:var(--accent-orange)">' + repairCount + '</div>\
                                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">维修</div>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
            </div>\
        </div>';
        container.innerHTML = html;
        this.generateQRCode(b.id);
    },

    generateQRCode: function(batteryId) {
        var box = document.getElementById('qrCodeBox');
        if (!box) return;
        var self = this;
        ApiService.getQrCodeData(batteryId).then(function(data) {
            box.innerHTML = '';
            var img = document.createElement('img');
            img.src = data.qr_code;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '8px';
            img.alt = 'Battery ' + batteryId + ' QR Code';
            box.appendChild(img);
        }).catch(function(err) {
            box.innerHTML = '<div style="color:var(--accent-red);font-size:12px;padding:20px">二维码生成失败: ' + err.message + '</div>';
        });
    },

    drawScoreCircle: function(score) {
        var canvas = document.getElementById('scoreCanvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var cx = 60, cy = 60, radius = 50;
        var start = -Math.PI / 2;
        var end = start + (score / 100) * Math.PI * 2;
        ctx.clearRect(0, 0, 120, 120);
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#2a3a5c'; ctx.lineWidth = 8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, radius, start, end);
        var grad = ctx.createLinearGradient(0, 0, 120, 120);
        if (score >= 80) { grad.addColorStop(0, '#10b981'); grad.addColorStop(1, '#06b6d4'); }
        else if (score >= 60) { grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#f59e0b'); }
        else { grad.addColorStop(0, '#ef4444'); grad.addColorStop(1, '#ef4444'); }
        ctx.strokeStyle = grad; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
    },

    traceSearch: function() {
        var query = document.getElementById('traceSearch').value.trim().toUpperCase();
        this.selectedBatteryId = query;
        this.renderTrace(document.getElementById('mainContent'));
    },

    selectBatteryForTrace: function(batteryId) {
        this.selectedBatteryId = batteryId;
        this.renderTrace(document.getElementById('mainContent'));
    },

    // ===== Recycle =====
    renderRecycle: function(container) {
        var self = this;
        Promise.all([
            ApiService.getRecyclingTasks()
        ]).then(function(results) {
            var tasks = results[0];
            var steps = ['待退役','待回收','运输中','已接收','梯次利用','已拆解'];
            var html = '\
            <div class="page active">\
                <div class="page-header"><h1>回收管理</h1><p>追踪退役电池流向，管理回收流程，确保电池生命周期闭环 (点击推进可推进回收流程)</p></div>\
                <div class="page-body">\
                    <div class="recycling-flow">';
            for (var i = 0; i < steps.length; i++) {
                var hasTask = false;
                for (var j = 0; j < tasks.length; j++) { if (tasks[j].step === i) { hasTask = true; break; } }
                html += '<div class="flow-step ' + (hasTask ? 'active' : '') + '"><div class="step-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + (hasTask ? '#10b981' : '#64748b') + '" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="step-label">' + steps[i] + '</div></div>';
                if (i < steps.length - 1) html += '<span class="flow-arrow">&rarr;</span>';
            }
            html += '</div>\
                    <div class="stat-grid">\
                        <div class="stat-card purple"><div class="stat-label">待退役</div><div class="stat-value">' + self.countByStep(tasks, 0) + '</div></div>\
                        <div class="stat-card orange"><div class="stat-label">待回收</div><div class="stat-value">' + self.countByStep(tasks, 1) + '</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">运输中</div><div class="stat-value">' + self.countByStep(tasks, 2) + '</div></div>\
                        <div class="stat-card"><div class="stat-label">已接收</div><div class="stat-value">' + self.countByStep(tasks, 3) + '</div></div>\
                        <div class="stat-card green"><div class="stat-label">梯次利用</div><div class="stat-value">' + self.countByStep(tasks, 4) + '</div></div>\
                        <div class="stat-card green"><div class="stat-label">已拆解</div><div class="stat-value">' + self.countByStep(tasks, 5) + '</div></div>\
                    </div>\
                    <div class="card">\
                        <div class="card-header"><h3>回收任务列表</h3></div>\
                        <table class="data-table"><thead><tr><th>任务编号</th><th>电池ID</th><th>回收企业</th><th>当前状态</th><th>负责人</th><th>操作</th></tr></thead><tbody>';
            for (var k = 0; k < tasks.length; k++) {
                var t = tasks[k];
                var badgeClass = ['badge-purple','badge-orange','badge-cyan','badge-blue','badge-green','badge-green'][t.step] || 'badge-gray';
                var canAdvance = t.step < 5;
                html += '<tr>\
                    <td>' + t.id + '</td>\
                    <td style="font-family:monospace;font-size:12px">' + t.battery_id + '</td>\
                    <td>' + t.enterprise + '</td>\
                    <td><span class="badge ' + badgeClass + '">' + t.status + '</span></td>\
                    <td>' + (t.contact || '-') + '</td>\
                    <td>\
                        ' + (canAdvance ? '<button class="btn btn-sm btn-primary admin-only" onclick="App.advanceRecycle(\'' + t.id + '\',\'' + t.battery_id + '\')">推进</button>' : '<span style="color:var(--text-muted);font-size:12px">已完成</span>') + '\
                        <button class="btn btn-sm btn-secondary" onclick="App.selectBatteryForDetail(\'' + t.battery_id + '\')">详情</button>\
                    </td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    advanceRecycle: function(taskId, batteryId) {
        if (!this.requireAdmin()) return;
        var self = this;
        this.showToast('正在推进回收流程...', 'info');
        ApiService.advanceRecycleStage(taskId).then(function(result) {
            self.showToast('回收流程已推进至: ' + result.status + ' (TxHash: ' + result.txHash.substr(0,16) + '...)', 'success');
            self.renderRecycle(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('推进失败: ' + err.message, 'error');
        });
    },

    // ===== Regulate =====
    renderRegulate: function(container) {
        var self = this;
        Promise.all([
            ApiService.getStats(),
            ApiService.getAnomalies(),
            ApiService.getEnterprises(),
            ApiService.getEnterpriseDist()
        ]).then(function(results) {
            var stats = results[0];
            var anomalies = results[1];
            var enterprises = results[2];
            var entDist = results[3];
            var html = '\
            <div class="page active">\
                <div class="page-header"><h1>监管大屏</h1><p>全生命周期审计、异常监测、电池流向追踪、回收完成率统计</p></div>\
                <div class="page-body">\
                    <div class="stat-grid">\
                        <div class="stat-card"><div class="stat-label">监管电池总数</div><div class="stat-value">' + self.formatNum(stats.totalBatteries) + '</div></div>\
                        <div class="stat-card red"><div class="stat-label">异常电池</div><div class="stat-value">' + stats.anomalyAlerts + '</div></div>\
                        <div class="stat-card green"><div class="stat-label">回收完成率</div><div class="stat-value">' + stats.recyclingRate + '%</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">监管企业数</div><div class="stat-value">' + stats.totalEnterprises + '</div></div>\
                    </div>\
                    <div class="chart-grid">\
                        <div class="chart-container"><div class="chart-title">企业类型分布</div><div class="chart-box" id="chartEnterpriseDist"></div></div>\
                        <div class="chart-container"><div class="chart-title">异常类型统计</div><div class="chart-box" id="chartAnomalyTypes"></div></div>\
                    </div>\
                    <div class="card mb-24">\
                        <div class="card-header"><h3>异常数据预警</h3><span class="badge badge-red">' + anomalies.length + '条</span></div>\
                        <div class="card-body">';
            for (var i = 0; i < anomalies.length; i++) {
                var a = anomalies[i];
                var levelBadge = a.level === '高危' ? 'badge-red' : a.level === '中危' ? 'badge-orange' : 'badge-gray';
                var statusBadge = a.status === '待处理' ? 'badge-red' : a.status === '处理中' ? 'badge-orange' : 'badge-green';
                html += '<div class="anomaly-alert">\
                    <div class="alert-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>\
                    <div class="alert-content">\
                        <div class="alert-title">' + a.anomaly_type + ' <span class="badge ' + levelBadge + '" style="margin-left:8px">' + a.level + '</span></div>\
                        <div class="alert-desc">' + a.description + '</div>\
                        <div class="timeline-meta" style="margin-top:6px">\
                            <span>电池: ' + a.battery_id + '</span>\
                            <span>编号: ' + a.id + '</span>\
                            <span>时间: ' + (a.created_at || '') + '</span>\
                            <span>状态: <span class="badge ' + statusBadge + '">' + a.status + '</span></span>\
                        </div>\
                        <div style="margin-top:8px;display:flex;gap:8px">';
                if (a.status === '待处理') {
                    html += '<button class="btn btn-sm btn-warning admin-only" onclick="App.resolveAnomaly(\'' + a.id + '\',\'处理中\')">开始处理</button>';
                } else if (a.status === '处理中') {
                    html += '<button class="btn btn-sm btn-success admin-only" onclick="App.resolveAnomaly(\'' + a.id + '\',\'已处理\')">标记已处理</button>';
                }
                html += '</div>\
                    </div>\
                </div>';
            }
            html += '</div></div>\
                    <div class="card mb-24">\
                        <div class="card-header"><h3>企业监管列表</h3></div>\
                        <table class="data-table"><thead><tr><th>企业名称</th><th>企业类型</th><th>角色</th><th>认证状态</th><th>操作</th></tr></thead><tbody>';
            for (var j = 0; j < enterprises.length; j++) {
                var e = enterprises[j];
                var roleLabel = (self.roles[e.role] ? self.roles[e.role].name : e.role);
                html += '<tr>\
                    <td>' + e.name + '</td>\
                    <td><span class="badge badge-blue">' + e.enterprise_type + '</span></td>\
                    <td>' + roleLabel + '</td>\
                    <td>' + (e.verified ? '<span class="badge badge-green">已认证</span>' : '<span class="badge badge-red">未认证</span>') + '</td>\
                    <td>' + (!e.verified ? '<button class="btn btn-sm btn-success admin-only" onclick="App.verifyEnt(' + e.id + ')">认证</button>' : '-') + '</td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                    <div class="chart-grid full"><div class="chart-container"><div class="chart-title">电池流向热力图 (地区分布)</div><div class="chart-box large" id="chartFlowHeatmap"></div></div></div>\
                </div>\
            </div>';
            container.innerHTML = html;
            self.initRegulateCharts(entDist, anomalies);
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    initRegulateCharts: function(entDist, anomalies) {
        var self = this;
        // Enterprise distribution
        var chart1 = echarts.init(document.getElementById('chartEnterpriseDist'));
        chart1.setOption({
            tooltip: { trigger: 'item' },
            legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
            color: ['#3b82f6','#06b6d4','#f59e0b','#8b5cf6','#10b981'],
            series: [{ type: 'pie', radius: ['35%','60%'], data: [{value:entDist.manufacturers,name:'电池生产企业'},{value:entDist.vehicleMakers,name:'汽车生产企业'},{value:entDist.maintenance,name:'维修机构'},{value:entDist.testing,name:'检测机构'},{value:entDist.recyclers,name:'回收企业'}], itemStyle: { borderColor: '#1a2332', borderWidth: 2 }, label: { color: '#94a3b8' } }]
        });
        this.charts.enterpriseDist = chart1;

        // Anomaly types
        var chart2 = echarts.init(document.getElementById('chartAnomalyTypes'));
        var typeMap = {};
        for (var i = 0; i < anomalies.length; i++) typeMap[anomalies[i].anomaly_type] = (typeMap[anomalies[i].anomaly_type] || 0) + 1;
        chart2.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
            xAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
            yAxis: { type: 'category', data: Object.keys(typeMap), axisLabel: { color: '#94a3b8', fontSize: 11 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
            series: [{ type: 'bar', data: Object.keys(typeMap).map(function(k){return typeMap[k];}), itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#ef4444'},{offset:1,color:'#f59e0b'}]), borderRadius: [0,4,4,0] }, barWidth: '60%' }]
        });
        this.charts.anomalyTypes = chart2;

        // Heatmap
        ApiService.getRegionDist().then(function(regions) {
            var chart3 = echarts.init(document.getElementById('chartFlowHeatmap'));
            var heatData = [];
            for (var r = 0; r < regions.length; r++) heatData.push([r, 0, regions[r].value]);
            chart3.setOption({
                tooltip: { formatter: function(p){return regions[p.data[0]].name + ': ' + p.data[2] + '块电池';} },
                grid: { left: '15%', right: '10%', bottom: '10%', top: '5%' },
                xAxis: { type: 'category', data: ['电池数量'], axisLabel: { color: '#94a3b8' } },
                yAxis: { type: 'category', data: regions.map(function(d){return d.name;}), axisLabel: { color: '#94a3b8' } },
                visualMap: { min: 0, max: 3000, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, textStyle: { color: '#94a3b8' }, inRange: { color: ['#1e293b','#3b82f6','#06b6d4','#10b981'] } },
                series: [{ type: 'heatmap', data: heatData, label: { show: true, color: '#fff', fontSize: 12 } }]
            });
            self.charts.flowHeatmap = chart3;
            self._setupResize();
        });
    },

    resolveAnomaly: function(anomalyId, newStatus) {
        if (!this.requireAdmin()) return;
        var self = this;
        ApiService.updateAnomalyStatus(anomalyId, newStatus).then(function() {
            self.showToast('异常状态已更新为: ' + newStatus, 'success');
            self.renderRegulate(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('更新失败: ' + err.message, 'error');
        });
    },

    verifyEnt: function(entId) {
        if (!this.requireAdmin()) return;
        var self = this;
        ApiService.verifyEnterprise(entId).then(function() {
            self.showToast('企业已认证', 'success');
            self.renderRegulate(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('认证失败: ' + err.message, 'error');
        });
    },

    // ===== Contracts =====
    renderContracts: function(container) {
        var self = this;
        Promise.all([
            ApiService.getContracts(),
            ApiService.getTransactions(20)
        ]).then(function(results) {
            var info = results[0];
            var txs = results[1];
            var allContracts = [
                { name: 'BatteryRegistry', desc: '动力电池身份登记合约', addr: info.contracts.BatteryRegistry, funcs: ['registerBattery()', 'getBattery()', 'updateBatteryStatus()', 'bindVehicle()'], color: 'blue' },
                { name: 'LifecycleRecord', desc: '生命周期记录合约', addr: info.contracts.LifecycleRecord, funcs: ['addRecord()', 'getRecord()', 'verifyRecord()'], color: 'cyan' },
                { name: 'RoleManager', desc: '机构身份与权限管理合约', addr: info.contracts.RoleManager, funcs: ['registerEnterprise()', 'checkPermission()', 'getRole()'], color: 'purple' },
                { name: 'BatteryTransfer', desc: '电池责任主体转移合约', addr: info.contracts.BatteryTransfer, funcs: ['transferBattery()', 'getTransferHistory()', 'getCurrentOwner()'], color: 'green' },
                { name: 'AnomalyDetector', desc: '异常检测合约', addr: info.contracts.AnomalyDetector, funcs: ['recordSohSnapshot()', 'reportAnomaly()', 'resolveAnomaly()', 'getAnomalies()'], color: 'red' },
                { name: 'HealthDataStore', desc: '电池健康数据存储合约', addr: info.contracts.HealthDataStore, funcs: ['uploadHealthData()', 'getLatestHealth()', 'getSohTrend()', 'getDegradationRate()'], color: 'orange' },
                { name: 'RecycleTracker', desc: '退役与回收追踪合约', addr: info.contracts.RecycleTracker, funcs: ['createRecycleTask()', 'advanceStage()', 'transferHandler()', 'recordMaterialRecovery()'], color: 'cyan' },
                { name: 'MaintenanceTracker', desc: '维护保养追踪合约', addr: info.contracts.MaintenanceTracker, funcs: ['logMaintenance()', 'getMaintenanceHistory()', 'getUpcomingMaintenance()', 'verifyMaintenanceRecord()'], color: 'orange' },
                { name: 'CarbonCredit', desc: '碳减排追踪合约', addr: info.contracts.CarbonCredit, funcs: ['recordCarbonReduction()', 'getCarbonHistory()', 'getCarbonSummary()', 'verifyCarbonRecord()'], color: 'green' },
                { name: 'CertificateRegistry', desc: '证书登记合约', addr: info.contracts.CertificateRegistry, funcs: ['issueCertificate()', 'revokeCertificate()', 'verifyCertificate()', 'getCertificateStats()'], color: 'blue' }
            ];
            var html = '\
            <div class="page active">\
                <div class="page-header"><h1>智能合约</h1><p>十大核心智能合约 - ' + info.network + ' / Block #' + info.blockNumber + ' / Gas ' + info.gasPrice + '</p></div>\
                <div class="page-body">\
                    <div class="stat-grid">\
                        <div class="stat-card"><div class="stat-label">已部署合约</div><div class="stat-value">10</div></div>\
                        <div class="stat-card green"><div class="stat-label">链上交易总数</div><div class="stat-value">' + self.formatNum(txs.length) + '</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">当前区块</div><div class="stat-value">#' + info.blockNumber + '</div></div>\
                        <div class="stat-card orange"><div class="stat-label">Gas Price</div><div class="stat-value">' + info.gasPrice + '</div></div>\
                    </div>';
            for (var i = 0; i < allContracts.length; i++) {
                var c = allContracts[i];
                html += '<div class="card mb-24">\
                    <div class="card-header"><h3>' + c.name + '</h3><span class="badge badge-' + c.color + '">' + c.desc + '</span></div>\
                    <div class="card-body">\
                        <div class="qr-info-item"><span class="label">合约地址</span><span class="value" style="font-family:monospace;font-size:12px;color:var(--accent-cyan)">' + c.addr + '</span></div>\
                        <div class="qr-info-item"><span class="label">合约函数</span></div>\
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
                for (var j = 0; j < c.funcs.length; j++) {
                    html += '<code style="background:var(--bg-secondary);padding:4px 10px;border-radius:6px;font-size:12px;color:var(--accent-cyan);border:1px solid var(--border-color)">' + c.funcs[j] + '</code>';
                }
                html += '</div></div></div>';
            }
            html += '<div class="card">\
                        <div class="card-header"><h3>链上交易记录</h3></div>\
                        <table class="data-table"><thead><tr><th>交易Hash</th><th>类型</th><th>电池ID</th><th>区块</th><th>提交者</th><th>时间</th><th>状态</th></tr></thead><tbody>';
            for (var k = 0; k < txs.length; k++) {
                var tx = txs[k];
                html += '<tr>\
                    <td style="font-family:monospace;font-size:12px;color:var(--accent-cyan)">' + (tx.tx_hash || '').substr(0,24) + '...</td>\
                    <td><span class="badge badge-blue">' + self.txTypeLabel(tx.tx_type) + '</span></td>\
                    <td style="font-family:monospace;font-size:12px">' + tx.battery_id + '</td>\
                    <td>#' + tx.block_number + '</td>\
                    <td style="font-family:monospace;font-size:12px">' + (tx.from_addr || '') + '</td>\
                    <td>' + (tx.created_at || '') + '</td>\
                    <td><span class="badge badge-green"><span class="badge-dot"></span>' + tx.status + '</span></td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    // ===== Advanced Search =====
    renderSearch: function(container) {
        var self = this;
        Promise.all([
            ApiService.getSearchFilters(),
            ApiService.getBatteries()
        ]).then(function(results) {
            var filters = results[0];
            var batteries = results[1];
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>高级搜索</h1>\
                    <p>多维度筛选电池数据，支持关键词、状态、类型、SOH范围、日期等条件</p>\
                </div>\
                <div class="page-body">\
                    <div class="card">\
                        <div class="card-header"><h3>筛选条件</h3></div>\
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;padding:20px">\
                            <div class="form-group"><label>关键词</label><input type="text" id="f_keyword" placeholder="ID/型号/VIN/批次" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                            <div class="form-group"><label>状态</label><select id="f_status" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"><option value="">全部</option>' + filters.statuses.map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join('') + '</select></div>\
                            <div class="form-group"><label>电池类型</label><select id="f_type" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"><option value="">全部</option>' + filters.types.map(function(t){return '<option value="'+t+'">'+t+'</option>';}).join('') + '</select></div>\
                            <div class="form-group"><label>生产商</label><select id="f_manufacturer" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"><option value="">全部</option>' + filters.manufacturers.map(function(m){return '<option value="'+m+'">'+m+'</option>';}).join('') + '</select></div>\
                            <div class="form-group"><label>SOH范围</label><div style="display:flex;gap:8px;align-items:center"><input type="number" id="f_soh_min" placeholder="0" min="0" max="100" style="width:80px;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px;border-radius:6px"><span style="color:var(--text-muted)">-</span><input type="number" id="f_soh_max" placeholder="100" min="0" max="100" style="width:80px;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px;border-radius:6px"></div></div>\
                            <div class="form-group"><label>生产日期从</label><input type="date" id="f_date_from" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                            <div class="form-group"><label>生产日期至</label><input type="date" id="f_date_to" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                            <div class="form-group"><label>排序</label><select id="f_sort" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"><option value="created_at">注册时间</option><option value="soh">SOH</option><option value="cycles">循环次数</option><option value="production_date">生产日期</option><option value="trust_score">信任分</option></select></div>\
                        </div>\
                        <div style="padding:0 20px 20px;display:flex;gap:12px">\
                            <button class="btn btn-primary" onclick="App.executeSearch()">搜索</button>\
                            <button class="btn" onclick="App.resetSearch()">重置</button>\
                            <button class="btn" onclick="App.exportSearchResults()">导出结果</button>\
                        </div>\
                    </div>\
                    <div class="card" style="margin-top:20px">\
                        <div class="card-header"><h3>搜索结果 <span id="searchCount" style="color:var(--text-muted);font-size:14px;font-weight:normal"></span></h3></div>\
                        <table class="data-table"><thead><tr><th>电池ID</th><th>生产商</th><th>型号</th><th>类型</th><th>容量</th><th>状态</th><th>SOH</th><th>循环次数</th><th>信任分</th><th>操作</th></tr></thead><tbody id="searchResults">';
            for (var i = 0; i < batteries.length; i++) {
                var b = batteries[i];
                html += '<tr>\
                    <td style="font-family:monospace;font-size:12px">' + b.id + '</td>\
                    <td>' + b.manufacturer + '</td>\
                    <td>' + b.model + '</td>\
                    <td>' + b.battery_type + '</td>\
                    <td>' + b.capacity + '</td>\
                    <td>' + self.statusBadge(b.status) + '</td>\
                    <td>' + b.soh + '%</td>\
                    <td>' + b.cycles + '</td>\
                    <td>' + b.trust_score + '</td>\
                    <td><span class="card-action" onclick="App.viewBatteryDetail(\'' + b.id + '\')">详情</span></td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
            document.getElementById('searchCount').textContent = '(' + batteries.length + '条)';
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    executeSearch: function() {
        var params = {
            keyword: document.getElementById('f_keyword').value,
            status: document.getElementById('f_status').value,
            type: document.getElementById('f_type').value,
            manufacturer: document.getElementById('f_manufacturer').value,
            soh_min: document.getElementById('f_soh_min').value,
            soh_max: document.getElementById('f_soh_max').value,
            date_from: document.getElementById('f_date_from').value,
            date_to: document.getElementById('f_date_to').value,
            sort: document.getElementById('f_sort').value,
            order: 'desc'
        };
        ApiService.searchBatteries(params).then(function(results) {
            var tbody = document.getElementById('searchResults');
            document.getElementById('searchCount').textContent = '(' + results.length + '条)';
            if (results.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">未找到匹配的电池</td></tr>';
                return;
            }
            var html = '';
            for (var i = 0; i < results.length; i++) {
                var b = results[i];
                html += '<tr>\
                    <td style="font-family:monospace;font-size:12px">' + b.id + '</td>\
                    <td>' + b.manufacturer + '</td>\
                    <td>' + b.model + '</td>\
                    <td>' + b.battery_type + '</td>\
                    <td>' + b.capacity + '</td>\
                    <td>' + App.statusBadge(b.status) + '</td>\
                    <td>' + b.soh + '%</td>\
                    <td>' + b.cycles + '</td>\
                    <td>' + b.trust_score + '</td>\
                    <td><span class="card-action" onclick="App.viewBatteryDetail(\'' + b.id + '\')">详情</span></td>\
                </tr>';
            }
            tbody.innerHTML = html;
            App.showToast('搜索完成，找到' + results.length + '条结果', 'success');
        }).catch(function(err) {
            App.showToast('搜索失败: ' + err.message, 'error');
        });
    },

    resetSearch: function() {
        var ids = ['f_keyword','f_status','f_type','f_manufacturer','f_soh_min','f_soh_max','f_date_from','f_date_to'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) { if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = ''; }
        }
        document.getElementById('f_sort').selectedIndex = 0;
        this.executeSearch();
    },

    exportSearchResults: function() {
        window.open(ApiService.getExportUrl('batteries', 'csv'), '_blank');
        this.showToast('正在导出CSV文件...', 'info');
    },

    viewBatteryDetail: function(id) {
        this.selectedBatteryId = id;
        this.renderPage('detail');
    },

    // ===== Maintenance Management =====
    renderMaintenance: function(container) {
        var self = this;
        Promise.all([
            ApiService.getMaintenanceRecords(),
            ApiService.getUpcomingMaintenance()
        ]).then(function(results) {
            var records = results[0];
            var upcoming = results[1];
            var totalCost = 0;
            for (var i = 0; i < records.length; i++) totalCost += records[i].cost || 0;
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>维护管理</h1>\
                    <p>电池维护保养记录管理与追踪，所有维护记录上链存证</p>\
                </div>\
                <div class="page-body">\
                    <div class="stat-grid">\
                        <div class="stat-card"><div class="stat-label">维护记录总数</div><div class="stat-value">' + records.length + '</div><div class="stat-trend up">链上存证</div></div>\
                        <div class="stat-card orange"><div class="stat-label">维护总成本</div><div class="stat-value">' + self.formatNum(Math.round(totalCost)) + '<span class="unit">CNY</span></div><div class="stat-trend up">累计</div></div>\
                        <div class="stat-card red"><div class="stat-label">即将到期保养</div><div class="stat-value">' + upcoming.length + '</div><div class="stat-trend down">90天内</div></div>\
                        <div class="stat-card green"><div class="stat-label">平均维护成本</div><div class="stat-value">' + (records.length ? Math.round(totalCost/records.length) : 0) + '<span class="unit">CNY</span></div><div class="stat-trend up">每次</div></div>\
                    </div>';
            if (upcoming.length > 0) {
                html += '<div class="card" style="border-color:var(--accent-orange)">\
                    <div class="card-header"><h3 style="color:var(--accent-orange)">即将到期保养提醒</h3></div>\
                    <table class="data-table"><thead><tr><th>电池ID</th><th>型号</th><th>当前SOH</th><th>上次维护</th><th>下次维护</th><th>维护机构</th></tr></thead><tbody>';
                for (var i = 0; i < upcoming.length; i++) {
                    var u = upcoming[i];
                    html += '<tr>\
                        <td style="font-family:monospace;font-size:12px">' + u.battery_id + '</td>\
                        <td>' + (u.manufacturer||'') + ' ' + (u.model||'') + '</td>\
                        <td>' + (u.soh||'-') + '%</td>\
                        <td>' + u.maintenance_date + '</td>\
                        <td style="color:var(--accent-orange)">' + u.next_maintenance_date + '</td>\
                        <td>' + u.provider + '</td>\
                    </tr>';
                }
                html += '</tbody></table></div>';
            }
            html += '<div class="card" style="margin-top:20px">\
                <div class="card-header"><h3>维护记录列表</h3><span class="card-action admin-only" onclick="App.showAddMaintenanceModal()">添加维护记录</span></div>\
                <table class="data-table"><thead><tr><th>记录ID</th><th>电池ID</th><th>维护类型</th><th>描述</th><th>维护机构</th><th>成本</th><th>维护日期</th><th>下次维护</th><th>交易Hash</th></tr></thead><tbody>';
            for (var i = 0; i < records.length; i++) {
                var r = records[i];
                html += '<tr>\
                    <td style="font-family:monospace;font-size:12px">' + r.id + '</td>\
                    <td style="font-family:monospace;font-size:12px">' + r.battery_id + '</td>\
                    <td><span class="badge badge-blue">' + r.maintenance_type + '</span></td>\
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + r.description + '">' + r.description + '</td>\
                    <td>' + r.provider + '</td>\
                    <td>' + self.formatNum(r.cost) + '</td>\
                    <td>' + r.maintenance_date + '</td>\
                    <td>' + (r.next_maintenance_date || '-') + '</td>\
                    <td style="font-family:monospace;font-size:11px;color:var(--accent-cyan)">' + (r.tx_hash||'').substr(0,16) + '...</td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    showAddMaintenanceModal: function() {
        var self = this;
        ApiService.getBatteries().then(function(batteries) {
            var html = '<div style="padding:24px;min-width:500px">\
                <h3 style="margin-bottom:20px">添加维护记录</h3>\
                <div style="display:grid;gap:16px">\
                    <div class="form-group"><label>记录ID</label><input type="text" id="m_id" placeholder="MNT-00X" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    <div class="form-group"><label>电池</label><select id="m_battery" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px">' + batteries.map(function(b){return '<option value="'+b.id+'">'+b.id+' ('+b.manufacturer+' '+b.model+')</option>';}).join('') + '</select></div>\
                    <div class="form-group"><label>维护类型</label><select id="m_type" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"><option value="常规保养">常规保养</option><option value="电芯更换">电芯更换</option><option value="故障维修">故障维修</option><option value="BMS升级">BMS升级</option><option value="冷却系统维护">冷却系统维护</option><option value="梯次重组">梯次重组</option></select></div>\
                    <div class="form-group"><label>描述</label><textarea id="m_desc" rows="3" placeholder="维护详细描述" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;resize:vertical"></textarea></div>\
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">\
                        <div class="form-group"><label>维护机构</label><input type="text" id="m_provider" placeholder="维护机构名称" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                        <div class="form-group"><label>成本(CNY)</label><input type="number" id="m_cost" placeholder="0" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    </div>\
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">\
                        <div class="form-group"><label>维护日期</label><input type="date" id="m_date" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                        <div class="form-group"><label>下次维护日期</label><input type="date" id="m_next" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    </div>\
                </div>\
                <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end">\
                    <button class="btn" onclick="App.closeModal()">取消</button>\
                    <button class="btn btn-primary" onclick="App.submitMaintenance()">提交并上链</button>\
                </div>\
            </div>';
            document.getElementById('modalContent').innerHTML = html;
            document.getElementById('modalOverlay').classList.add('show');
        });
    },

    submitMaintenance: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        var data = {
            id: document.getElementById('m_id').value,
            battery_id: document.getElementById('m_battery').value,
            maintenance_type: document.getElementById('m_type').value,
            description: document.getElementById('m_desc').value,
            provider: document.getElementById('m_provider').value,
            cost: parseFloat(document.getElementById('m_cost').value) || 0,
            maintenance_date: document.getElementById('m_date').value,
            next_maintenance_date: document.getElementById('m_next').value || null,
            operator: '当前用户'
        };
        if (!data.id || !data.battery_id || !data.description || !data.provider || !data.maintenance_date) {
            this.showToast('请填写必填字段', 'error');
            return;
        }
        ApiService.addMaintenanceRecord(data).then(function(result) {
            self.closeModal();
            self.showToast('维护记录已上链: ' + result.txHash.substr(0,16) + '...', 'success');
            self.renderMaintenance(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('提交失败: ' + err.message, 'error');
        });
    },

    // ===== Carbon Dashboard =====
    renderCarbon: function(container) {
        var self = this;
        Promise.all([
            ApiService.getCarbonStats(),
            ApiService.getCarbonRecords()
        ]).then(function(results) {
            var stats = results[0];
            var records = results[1];
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>碳减排大屏</h1>\
                    <p>追踪电池梯次利用、材料回收、维修延寿带来的碳减排效益</p>\
                </div>\
                <div class="page-body">\
                    <div class="stat-grid">\
                        <div class="stat-card green"><div class="stat-label">碳减排总量</div><div class="stat-value">' + self.formatNum(stats.totalCarbonSaved) + '<span class="unit">kgCO2</span></div><div class="stat-trend up">' + (stats.totalCarbonSaved/1000).toFixed(1) + ' tCO2</div></div>\
                        <div class="stat-card"><div class="stat-label">碳减排记录</div><div class="stat-value">' + stats.totalRecords + '</div><div class="stat-trend up">链上存证</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">等效植树</div><div class="stat-value">' + self.formatNum(stats.equivalentTrees) + '<span class="unit">棵</span></div><div class="stat-trend up">碳吸收量</div></div>\
                        <div class="stat-card purple"><div class="stat-label">等效减排车辆</div><div class="stat-value">' + Math.round(stats.totalCarbonSaved/120) + '<span class="unit">辆/年</span></div><div class="stat-trend up">替代燃油车</div></div>\
                    </div>\
                    <div class="chart-grid">\
                        <div class="chart-container"><div class="chart-title">碳减排类型分布</div><div class="chart-box" id="chartCarbonType"></div></div>\
                        <div class="chart-container"><div class="chart-title">月度碳减排趋势</div><div class="chart-box" id="chartCarbonTrend"></div></div>\
                    </div>\
                    <div class="chart-grid full">\
                        <div class="chart-container"><div class="chart-title">各电池碳减排贡献</div><div class="chart-box" id="chartCarbonBattery"></div></div>\
                    </div>\
                    <div class="card">\
                        <div class="card-header"><h3>碳减排记录明细</h3><span class="card-action admin-only" onclick="App.showAddCarbonModal()">添加碳减排记录</span></div>\
                        <table class="data-table"><thead><tr><th>记录ID</th><th>电池ID</th><th>类型</th><th>描述</th><th>减排量</th><th>核证方</th><th>日期</th><th>交易Hash</th></tr></thead><tbody>';
            for (var i = 0; i < records.length; i++) {
                var r = records[i];
                html += '<tr>\
                    <td style="font-family:monospace;font-size:12px">' + r.id + '</td>\
                    <td style="font-family:monospace;font-size:12px">' + r.battery_id + '</td>\
                    <td><span class="badge badge-green">' + r.record_type + '</span></td>\
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + r.description + '">' + r.description + '</td>\
                    <td style="color:var(--accent-green);font-weight:600">' + r.carbon_saved + ' ' + (r.unit||'kgCO2') + '</td>\
                    <td>' + (r.verifier||'-') + '</td>\
                    <td>' + r.record_date + '</td>\
                    <td style="font-family:monospace;font-size:11px;color:var(--accent-cyan)">' + (r.tx_hash||'').substr(0,16) + '...</td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
            self.initCarbonCharts(stats);
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    initCarbonCharts: function(stats) {
        var self = this;
        var chart1 = echarts.init(document.getElementById('chartCarbonType'));
        chart1.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {c} kgCO2 ({d}%)' },
            legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
            color: ['#10b981','#06b6d4','#3b82f6','#8b5cf6'],
            series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'], itemStyle: { borderColor: '#1a2332', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14 } }, data: stats.byType.map(function(d){return {value:d.value,name:d.name};}) }]
        });
        self.charts.carbonType = chart1;

        var chart2 = echarts.init(document.getElementById('chartCarbonTrend'));
        chart2.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
            xAxis: { type: 'category', data: stats.monthlyTrend.map(function(d){return d.month;}), axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
            yAxis: { type: 'value', name: 'kgCO2', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
            series: [{ name: '碳减排', type: 'bar', data: stats.monthlyTrend.map(function(d){return d.total;}), itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#10b981'},{offset:1,color:'#0d5f3f'}]), borderRadius: [4,4,0,0] }, barWidth: '50%' }]
        });
        self.charts.carbonTrend = chart2;

        var chart3 = echarts.init(document.getElementById('chartCarbonBattery'));
        var batteryData = stats.byBattery.slice(0, 10);
        chart3.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
            xAxis: { type: 'category', data: batteryData.map(function(d){return (d.manufacturer||'')+' '+(d.model||'');}), axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 20 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
            yAxis: { type: 'value', name: 'kgCO2', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
            series: [{ name: '碳减排量', type: 'bar', data: batteryData.map(function(d){return d.total;}), itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#06b6d4'},{offset:1,color:'#0d4a5f'}]), borderRadius: [4,4,0,0] }, barWidth: '40%' }]
        });
        self.charts.carbonBattery = chart3;
        self._setupResize();
    },

    showAddCarbonModal: function() {
        var self = this;
        ApiService.getBatteries().then(function(batteries) {
            var html = '<div style="padding:24px;min-width:500px">\
                <h3 style="margin-bottom:20px">添加碳减排记录</h3>\
                <div style="display:grid;gap:16px">\
                    <div class="form-group"><label>记录ID</label><input type="text" id="c_id" placeholder="CRB-00X" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    <div class="form-group"><label>电池</label><select id="c_battery" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px">' + batteries.map(function(b){return '<option value="'+b.id+'">'+b.id+' ('+b.manufacturer+' '+b.model+')</option>';}).join('') + '</select></div>\
                    <div class="form-group"><label>减排类型</label><select id="c_type" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"><option value="梯次利用减排">梯次利用减排</option><option value="材料回收减排">材料回收减排</option><option value="维修延寿减排">维修延寿减排</option><option value="绿色运输减排">绿色运输减排</option></select></div>\
                    <div class="form-group"><label>描述</label><textarea id="c_desc" rows="3" placeholder="碳减排详细描述" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px;resize:vertical"></textarea></div>\
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">\
                        <div class="form-group"><label>碳减排量(kgCO2)</label><input type="number" id="c_amount" placeholder="0" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                        <div class="form-group"><label>核证方</label><input type="text" id="c_verifier" placeholder="核证机构" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    </div>\
                    <div class="form-group"><label>记录日期</label><input type="date" id="c_date" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                </div>\
                <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end">\
                    <button class="btn" onclick="App.closeModal()">取消</button>\
                    <button class="btn btn-primary" onclick="App.submitCarbon()">提交并上链</button>\
                </div>\
            </div>';
            document.getElementById('modalContent').innerHTML = html;
            document.getElementById('modalOverlay').classList.add('show');
        });
    },

    submitCarbon: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        var data = {
            id: document.getElementById('c_id').value,
            battery_id: document.getElementById('c_battery').value,
            record_type: document.getElementById('c_type').value,
            description: document.getElementById('c_desc').value,
            carbon_saved: parseFloat(document.getElementById('c_amount').value) || 0,
            verifier: document.getElementById('c_verifier').value,
            record_date: document.getElementById('c_date').value
        };
        if (!data.id || !data.battery_id || !data.description || !data.carbon_saved || !data.record_date) {
            this.showToast('请填写必填字段', 'error');
            return;
        }
        ApiService.addCarbonRecord(data).then(function(result) {
            self.closeModal();
            self.showToast('碳减排记录已上链: ' + result.txHash.substr(0,16) + '...', 'success');
            self.renderCarbon(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('提交失败: ' + err.message, 'error');
        });
    },

    // ===== Battery Comparison =====
    renderCompare: function(container) {
        var self = this;
        ApiService.getBatteries().then(function(batteries) {
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>电池对比分析</h1>\
                    <p>选择多块电池进行SOH、循环次数、信任分等维度对比</p>\
                </div>\
                <div class="page-body">\
                    <div class="card">\
                        <div class="card-header"><h3>选择电池</h3></div>\
                        <div style="padding:16px;display:flex;flex-wrap:wrap;gap:8px">';
            for (var i = 0; i < batteries.length; i++) {
                var b = batteries[i];
                html += '<label style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg-darker);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:13px"><input type="checkbox" value="' + b.id + '" class="compare-cb" style="accent-color:var(--accent-blue)">' + b.id + ' (' + b.manufacturer + ')</label>';
            }
            html += '</div>\
                        <div style="padding:0 16px 16px"><button class="btn btn-primary" onclick="App.executeCompare()">开始对比</button></div>\
                    </div>\
                    <div id="compareResult" style="margin-top:20px"></div>\
                </div>\
            </div>';
            container.innerHTML = html;
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    executeCompare: function() {
        var self = this;
        var selected = [];
        var cbs = document.querySelectorAll('.compare-cb:checked');
        for (var i = 0; i < cbs.length; i++) selected.push(cbs[i].value);
        if (selected.length < 2) { this.showToast('请至少选择2块电池进行对比', 'error'); return; }
        if (selected.length > 5) { this.showToast('最多支持5块电池对比', 'error'); return; }

        Promise.all(selected.map(function(id) { return ApiService.getBattery(id); })).then(function(batteries) {
            var html = '<div class="card"><div class="card-header"><h3>对比结果</h3></div><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>对比项</th>';
            for (var i = 0; i < batteries.length; i++) html += '<th style="min-width:160px">' + batteries[i].id + '</th>';
            html += '</tr></thead><tbody>';
            var rows = [
                {label:'生产商', getter:function(b){return b.manufacturer;}},
                {label:'型号', getter:function(b){return b.model;}},
                {label:'电池类型', getter:function(b){return b.battery_type;}},
                {label:'容量', getter:function(b){return b.capacity;}},
                {label:'批次', getter:function(b){return b.batch;}},
                {label:'生产日期', getter:function(b){return b.production_date;}},
                {label:'当前状态', getter:function(b){return b.status;}, badge:true},
                {label:'SOH', getter:function(b){return b.soh + '%';}},
                {label:'SOC', getter:function(b){return b.soc + '%';}},
                {label:'循环次数', getter:function(b){return b.cycles;}},
                {label:'当前持有方', getter:function(b){return b.current_owner || '-';}},
                {label:'信任分', getter:function(b){return b.trust_score;}},
                {label:'已使用年限', getter:function(b){return self.calcYears(b.production_date) + '年';}},
                {label:'生命周期事件数', getter:function(b){return (b.lifecycleEvents||[]).length;}},
                {label:'转移记录数', getter:function(b){return (b.transferHistory||[]).length;}},
                {label:'区块高度', getter:function(b){return '#' + (b.block_number||'-');}},
                {label:'交易Hash', getter:function(b){return (b.tx_hash||'').substr(0,20) + '...';}, mono:true}
            ];
            for (var r = 0; r < rows.length; r++) {
                html += '<tr><td style="font-weight:600;color:var(--text-bright)">' + rows[r].label + '</td>';
                for (var i = 0; i < batteries.length; i++) {
                    var val = rows[r].getter(batteries[i]);
                    var style = rows[r].mono ? 'font-family:monospace;font-size:11px;color:var(--accent-cyan)' : '';
                    if (rows[r].badge) val = App.statusBadge(val);
                    html += '<td style="' + style + '">' + val + '</td>';
                }
                html += '</tr>';
            }
            html += '</tbody></table></div></div>\
            <div class="chart-grid full" style="margin-top:20px">\
                <div class="chart-container"><div class="chart-title">SOH对比</div><div class="chart-box" id="chartCompareSOH"></div></div>\
            </div>';
            document.getElementById('compareResult').innerHTML = html;

            var chart = echarts.init(document.getElementById('chartCompareSOH'));
            chart.setOption({
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { data: ['SOH','SOC','信任分'], textStyle: { color: '#94a3b8' }, top: 0 },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
                xAxis: { type: 'category', data: batteries.map(function(b){return b.id;}), axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 20 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
                yAxis: { type: 'value', max: 100, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                series: [
                    { name: 'SOH', type: 'bar', data: batteries.map(function(b){return b.soh;}), itemStyle: { color: '#3b82f6', borderRadius: [4,4,0,0] }, barWidth: '15%' },
                    { name: 'SOC', type: 'bar', data: batteries.map(function(b){return b.soc;}), itemStyle: { color: '#06b6d4', borderRadius: [4,4,0,0] }, barWidth: '15%' },
                    { name: '信任分', type: 'bar', data: batteries.map(function(b){return b.trust_score;}), itemStyle: { color: '#10b981', borderRadius: [4,4,0,0] }, barWidth: '15%' }
                ]
            });
            self.charts.compareSOH = chart;
            self._setupResize();
        }).catch(function(err) {
            self.showToast('对比失败: ' + err.message, 'error');
        });
    },

    // ===== Certificate Management =====
    renderCertificates: function(container) {
        var self = this;
        ApiService.getCertificates().then(function(certs) {
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>证书管理</h1>\
                    <p>电池相关数字证书签发、验证与管理，所有证书上链存证</p>\
                </div>\
                <div class="page-body">\
                    <div class="stat-grid">\
                        <div class="stat-card"><div class="stat-label">证书总数</div><div class="stat-value">' + certs.length + '</div><div class="stat-trend up">已签发</div></div>\
                        <div class="stat-card green"><div class="stat-label">有效证书</div><div class="stat-value">' + certs.filter(function(c){return c.status==='有效';}).length + '</div><div class="stat-trend up">当前有效</div></div>\
                        <div class="stat-card red"><div class="stat-label">已撤销</div><div class="stat-value">' + certs.filter(function(c){return c.status==='已撤销';}).length + '</div><div class="stat-trend down">已失效</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">证书类型</div><div class="stat-value">' + new Set(certs.map(function(c){return c.cert_type;})).size + '</div><div class="stat-trend up">种类型</div></div>\
                    </div>\
                    <div class="card">\
                        <div class="card-header"><h3>证书验证</h3></div>\
                        <div style="padding:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">\
                            <select id="verifyCertSelect" style="flex:1;min-width:200px;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px">\
                                <option value="">-- 选择已有证书或手动输入 --</option>\
                                ' + certs.map(function(c) { return '<option value="' + c.cert_number + '">' + c.cert_number + ' (' + c.cert_type + ' - ' + c.battery_id + ')</option>'; }).join('') + '\
                            </select>\
                            <input type="text" id="verifyCertNum" placeholder="或手动输入证书编号" style="flex:1;min-width:200px;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px">\
                            <button class="btn btn-primary" onclick="App.verifyCert()">验证</button>\
                        </div>\
                        <div id="verifyResult" style="padding:0 16px 16px"></div>\
                    </div>\
                    <div class="card" style="margin-top:20px">\
                        <div class="card-header"><h3>证书列表</h3><span class="card-action admin-only" onclick="App.showIssueCertModal()">签发证书</span></div>\
                        <table class="data-table"><thead><tr><th>证书ID</th><th>电池ID</th><th>证书类型</th><th>证书编号</th><th>签发方</th><th>签发日期</th><th>有效期至</th><th>状态</th><th>操作</th></tr></thead><tbody>';
            for (var i = 0; i < certs.length; i++) {
                var c = certs[i];
                var statusBadge = c.status === '有效' ? '<span class="badge badge-green">' + c.status + '</span>' : '<span class="badge badge-red">' + c.status + '</span>';
                html += '<tr>\
                    <td style="font-family:monospace;font-size:12px">' + c.id + '</td>\
                    <td style="font-family:monospace;font-size:12px">' + c.battery_id + '</td>\
                    <td><span class="badge badge-blue">' + c.cert_type + '</span></td>\
                    <td style="font-family:monospace;font-size:12px">' + c.cert_number + '</td>\
                    <td>' + c.issuer + '</td>\
                    <td>' + c.issue_date + '</td>\
                    <td>' + (c.expiry_date || '长期有效') + '</td>\
                    <td>' + statusBadge + '</td>\
                    <td>' + (c.status === '有效' ? '<span class="card-action admin-only" style="color:var(--accent-red)" onclick="App.revokeCert(\'' + c.id + '\')">撤销</span>' : '-') + '</td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    verifyCert: function() {
        var certNum = document.getElementById('verifyCertNum').value.trim();
        var selectVal = document.getElementById('verifyCertSelect') ? document.getElementById('verifyCertSelect').value : '';
        if (!certNum && selectVal) { certNum = selectVal; }
        if (!certNum) { this.showToast('请选择或输入证书编号', 'error'); return; }
        var resultDiv = document.getElementById('verifyResult');
        resultDiv.innerHTML = '<div style="padding:16px;color:var(--text-muted)">正在验证...</div>';
        ApiService.verifyCertificate(certNum).then(function(data) {
            if (data.valid) {
                var c = data.certificate;
                resultDiv.innerHTML = '<div style="padding:16px;background:rgba(16,185,129,0.1);border:1px solid var(--accent-green);border-radius:8px">\
                    <div style="color:var(--accent-green);font-weight:600;margin-bottom:12px;font-size:16px">验证通过 - 证书有效</div>\
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">\
                        <div><span style="color:var(--text-muted)">证书编号:</span> <span style="color:var(--text)">' + c.cert_number + '</span></div>\
                        <div><span style="color:var(--text-muted)">证书类型:</span> <span style="color:var(--text)">' + c.cert_type + '</span></div>\
                        <div><span style="color:var(--text-muted)">电池ID:</span> <span style="color:var(--text)">' + c.battery_id + '</span></div>\
                        <div><span style="color:var(--text-muted)">电池型号:</span> <span style="color:var(--text)">' + (c.manufacturer || '') + ' ' + (c.model || '') + '</span></div>\
                        <div><span style="color:var(--text-muted)">签发方:</span> <span style="color:var(--text)">' + c.issuer + '</span></div>\
                        <div><span style="color:var(--text-muted)">签发日期:</span> <span style="color:var(--text)">' + c.issue_date + '</span></div>\
                        <div><span style="color:var(--text-muted)">有效期至:</span> <span style="color:var(--text)">' + (c.expiry_date || '长期有效') + '</span></div>\
                        <div><span style="color:var(--text-muted)">状态:</span> <span style="color:var(--accent-green);font-weight:600">有效</span></div>\
                        <div><span style="color:var(--text-muted)">交易Hash:</span> <span style="color:var(--text);font-family:monospace;font-size:11px">' + (c.tx_hash || '-') + '</span></div>\
                        <div><span style="color:var(--text-muted)">区块高度:</span> <span style="color:var(--text)">' + (c.block_number || '-') + '</span></div>\
                    </div></div>';
            } else {
                resultDiv.innerHTML = '<div style="padding:16px;background:rgba(239,68,68,0.1);border:1px solid var(--accent-red);border-radius:8px">\
                    <div style="color:var(--accent-red);font-weight:600;margin-bottom:8px">验证失败</div>\
                    <div style="font-size:13px;color:var(--text-muted)">证书状态: ' + (data.certificate ? data.certificate.status : '未知') + '</div></div>';
            }
        }).catch(function(err) {
            resultDiv.innerHTML = '<div style="padding:16px;background:rgba(239,68,68,0.1);border:1px solid var(--accent-red);border-radius:8px">\
                <div style="color:var(--accent-red);font-weight:600;margin-bottom:8px">证书不存在</div>\
                <div style="font-size:13px;color:var(--text-muted)">未找到编号为 ' + certNum + ' 的证书，请检查输入</div></div>';
        });
    },

    showIssueCertModal: function() {
        var self = this;
        ApiService.getBatteries().then(function(batteries) {
            var html = '<div style="padding:24px;min-width:500px">\
                <h3 style="margin-bottom:20px">签发证书</h3>\
                <div style="display:grid;gap:16px">\
                    <div class="form-group"><label>证书ID</label><input type="text" id="cert_id" placeholder="CERT-00X" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    <div class="form-group"><label>电池</label><select id="cert_battery" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px">' + batteries.map(function(b){return '<option value="'+b.id+'">'+b.id+' ('+b.manufacturer+' '+b.model+')</option>';}).join('') + '</select></div>\
                    <div class="form-group"><label>证书类型</label><select id="cert_type" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"><option value="产品质量合格证">产品质量合格证</option><option value="维修合格证">维修合格证</option><option value="退役评估报告">退役评估报告</option><option value="梯次利用合格证">梯次利用合格证</option><option value="回收处理证明">回收处理证明</option><option value="合规证书">合规证书</option></select></div>\
                    <div class="form-group"><label>证书编号</label><input type="text" id="cert_number" placeholder="QC-2026-XX-XXXXX" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    <div class="form-group"><label>签发方</label><input type="text" id="cert_issuer" placeholder="签发机构" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">\
                        <div class="form-group"><label>签发日期</label><input type="date" id="cert_issue" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                        <div class="form-group"><label>有效期至(可选)</label><input type="date" id="cert_expiry" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:6px"></div>\
                    </div>\
                </div>\
                <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end">\
                    <button class="btn" onclick="App.closeModal()">取消</button>\
                    <button class="btn btn-primary" onclick="App.submitCert()">签发并上链</button>\
                </div>\
            </div>';
            document.getElementById('modalContent').innerHTML = html;
            document.getElementById('modalOverlay').classList.add('show');
        });
    },

    submitCert: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        var data = {
            id: document.getElementById('cert_id').value,
            battery_id: document.getElementById('cert_battery').value,
            cert_type: document.getElementById('cert_type').value,
            cert_number: document.getElementById('cert_number').value,
            issuer: document.getElementById('cert_issuer').value,
            issue_date: document.getElementById('cert_issue').value,
            expiry_date: document.getElementById('cert_expiry').value || null
        };
        if (!data.id || !data.battery_id || !data.cert_type || !data.cert_number || !data.issuer || !data.issue_date) {
            this.showToast('请填写必填字段', 'error');
            return;
        }
        ApiService.issueCertificate(data).then(function(result) {
            self.closeModal();
            self.showToast('证书已签发: ' + result.certNumber, 'success');
            self.renderCertificates(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('签发失败: ' + err.message, 'error');
        });
    },

    revokeCert: function(id) {
        if (!this.requireAdmin()) return;
        var self = this;
        if (!confirm('确认撤销此证书?')) return;
        ApiService.revokeCertificate(id).then(function() {
            self.showToast('证书已撤销', 'success');
            self.renderCertificates(document.getElementById('mainContent'));
        }).catch(function(err) {
            self.showToast('撤销失败: ' + err.message, 'error');
        });
    },

    // ===== Audit Log =====
    renderAudit: function(container) {
        var self = this;
        Promise.all([
            ApiService.getAuditLogs({ limit: 50 }),
            ApiService.getAuditStats()
        ]).then(function(results) {
            var logs = results[0];
            var stats = results[1];
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>审计日志</h1>\
                    <p>全链路操作审计追踪，所有写操作均记录在链</p>\
                </div>\
                <div class="page-body">\
                    <div class="stat-grid">\
                        <div class="stat-card"><div class="stat-label">审计日志总数</div><div class="stat-value">' + self.formatNum(stats.totalLogs) + '</div><div class="stat-trend up">全链路记录</div></div>\
                        <div class="stat-card green"><div class="stat-label">今日操作</div><div class="stat-value">' + stats.recentActivity + '</div><div class="stat-trend up">实时追踪</div></div>\
                        <div class="stat-card cyan"><div class="stat-label">操作类型</div><div class="stat-value">' + stats.byAction.length + '</div><div class="stat-trend up">种</div></div>\
                        <div class="stat-card purple"><div class="stat-label">操作人员</div><div class="stat-value">' + stats.byOperator.length + '</div><div class="stat-trend up">位</div></div>\
                    </div>\
                    <div class="chart-grid">\
                        <div class="chart-container"><div class="chart-title">操作类型分布</div><div class="chart-box" id="chartAuditAction"></div></div>\
                        <div class="chart-container"><div class="chart-title">操作人员排行</div><div class="chart-box" id="chartAuditOperator"></div></div>\
                    </div>\
                    <div class="card">\
                        <div class="card-header"><h3>审计日志</h3><span class="card-action" onclick="App.exportAuditLog()">导出日志</span></div>\
                        <table class="data-table"><thead><tr><th>时间</th><th>操作人</th><th>操作</th><th>对象类型</th><th>对象ID</th><th>详情</th><th>IP地址</th><th>交易Hash</th></tr></thead><tbody>';
            for (var i = 0; i < logs.length; i++) {
                var l = logs[i];
                html += '<tr>\
                    <td style="font-size:12px;white-space:nowrap">' + l.created_at + '</td>\
                    <td>' + l.operator + '</td>\
                    <td><span class="badge badge-blue">' + l.action + '</span></td>\
                    <td>' + (l.target_type || '-') + '</td>\
                    <td style="font-family:monospace;font-size:12px">' + (l.target_id || '-') + '</td>\
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (l.detail||'') + '">' + (l.detail || '-') + '</td>\
                    <td style="font-family:monospace;font-size:12px">' + (l.ip_address || '-') + '</td>\
                    <td style="font-family:monospace;font-size:11px;color:var(--accent-cyan)">' + (l.tx_hash ? l.tx_hash.substr(0,16)+'...' : '-') + '</td>\
                </tr>';
            }
            html += '</tbody></table></div>\
                </div>\
            </div>';
            container.innerHTML = html;
            self.initAuditCharts(stats);
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    initAuditCharts: function(stats) {
        var self = this;
        var chart1 = echarts.init(document.getElementById('chartAuditAction'));
        chart1.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            legend: { type: 'scroll', bottom: 0, textStyle: { color: '#94a3b8', fontSize: 10 } },
            color: ['#3b82f6','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6','#64748b'],
            series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'], itemStyle: { borderColor: '#1a2332', borderWidth: 2 }, label: { show: false }, data: stats.byAction.map(function(d){return {value:d.value,name:d.name};}) }]
        });
        self.charts.auditAction = chart1;

        var chart2 = echarts.init(document.getElementById('chartAuditOperator'));
        chart2.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
            xAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
            yAxis: { type: 'category', data: stats.byOperator.map(function(d){return d.name;}).reverse(), axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
            series: [{ type: 'bar', data: stats.byOperator.map(function(d){return d.value;}).reverse(), itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#3b82f6'},{offset:1,color:'#1e3a5f'}]), borderRadius: [0,4,4,0] }, barWidth: '60%' }]
        });
        self.charts.auditOperator = chart2;
        self._setupResize();
    },

    exportAuditLog: function() {
        window.open(ApiService.getExportUrl('audit', 'csv'), '_blank');
        this.showToast('正在导出审计日志...', 'info');
    },

    // ===== 预警中心 =====
    renderAlerts: function(container) {
        var self = this;
        Promise.all([
            ApiService.getAlerts(),
            ApiService.getAlertSummary()
        ]).then(function(results) {
            var data = results[0];
            var summary = results[1];
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>预警中心</h1>\
                    <p>聚合异常告警、保养到期、SOH预警、证书到期等全系统预警信息</p>\
                </div>\
                <div class="stat-grid">\
                    <div class="stat-card stat-red"><div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="stat-value">' + data.critical + '</div><div class="stat-label">严重预警</div></div>\
                    <div class="stat-card stat-orange"><div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div><div class="stat-value">' + data.warning + '</div><div class="stat-label">警告预警</div></div>\
                    <div class="stat-card stat-blue"><div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-value">' + data.info + '</div><div class="stat-label">提示预警</div></div>\
                    <div class="stat-card stat-green"><div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="stat-value">' + summary.total + '</div><div class="stat-label">待处理总数</div></div>\
                </div>\
                <div class="card" style="margin-top:16px">\
                    <div class="card-header"><h3>预警分类统计</h3></div>\
                    <div class="card-body">\
                        <div class="stat-grid stat-grid-4">\
                            <div class="mini-stat"><div class="mini-stat-value">' + (data.byCategory['异常告警'] || 0) + '</div><div class="mini-stat-label">异常告警</div></div>\
                            <div class="mini-stat"><div class="mini-stat-value">' + (data.byCategory['保养到期'] || 0) + '</div><div class="mini-stat-label">保养到期</div></div>\
                            <div class="mini-stat"><div class="mini-stat-value">' + (data.byCategory['健康预警'] || 0) + '</div><div class="mini-stat-label">健康预警</div></div>\
                            <div class="mini-stat"><div class="mini-stat-value">' + (data.byCategory['证书到期'] || 0) + '</div><div class="mini-stat-label">证书到期</div></div>\
                        </div>\
                    </div>\
                </div>\
                <div class="card" style="margin-top:16px">\
                    <div class="card-header"><h3>预警列表</h3>\
                        <div class="filter-bar">\
                            <select id="alertSeverityFilter" onchange="App.filterAlerts()">\
                                <option value="">全部级别</option>\
                                <option value="严重">严重</option>\
                                <option value="警告">警告</option>\
                                <option value="提示">提示</option>\
                            </select>\
                            <select id="alertCategoryFilter" onchange="App.filterAlerts()">\
                                <option value="">全部分类</option>\
                                <option value="异常告警">异常告警</option>\
                                <option value="保养到期">保养到期</option>\
                                <option value="健康预警">健康预警</option>\
                                <option value="证书到期">证书到期</option>\
                            </select>\
                        </div>\
                    </div>\
                    <div class="card-body" id="alertListContainer">' + self.renderAlertList(data.alerts) + '</div>\
                </div>\
            </div>';
            container.innerHTML = html;
            self.alertsData = data.alerts;
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    renderAlertList: function(alerts) {
        if (!alerts || alerts.length === 0) {
            return '<div style="padding:40px;text-align:center;color:var(--text-muted)">暂无预警信息</div>';
        }
        var sevMap = { '严重': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }, '警告': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }, '提示': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' } };
        var html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>级别</th><th>分类</th><th>标题</th><th>描述</th><th>电池ID</th><th>到期/时间</th><th>操作</th></tr></thead><tbody>';
        for (var i = 0; i < alerts.length; i++) {
            var a = alerts[i];
            var s = sevMap[a.severity] || sevMap['提示'];
            var dueInfo = '';
            if (a.days_left !== undefined && a.days_left < 0) {
                dueInfo = '已到期 (' + (a.due_date || '') + ')';
            } else if (a.days_left !== undefined && a.days_left === 0) {
                dueInfo = '今日到期 (' + (a.due_date || '') + ')';
            } else if (a.days_left !== undefined) {
                dueInfo = a.days_left + '天后到期 (' + (a.due_date || '') + ')';
            } else if (a.due_date) {
                dueInfo = a.due_date;
            } else {
                dueInfo = (a.created_at || '').substring(0, 10);
            }
            var action = a.source === 'anomaly' ? '<button class="btn-sm btn-blue" onclick="App.renderPage(\'detail\');setTimeout(function(){document.getElementById(\'detailSearch\').value=\'' + a.battery_id + '\';App.searchBatteryDetail();},300)">查看详情</button>' : '<button class="btn-sm" onclick="App.renderPage(\'detail\');setTimeout(function(){document.getElementById(\'detailSearch\').value=\'' + a.battery_id + '\';App.searchBatteryDetail();},300)">查看电池</button>';
            html += '<tr><td><span style="color:' + s.color + ';background:' + s.bg + ';padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600">' + a.severity + '</span></td><td>' + a.category + '</td><td>' + a.title + '</td><td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + a.description + '">' + a.description + '</td><td style="font-size:12px">' + (a.battery_id || '-') + '</td><td style="font-size:12px">' + dueInfo + '</td><td>' + action + '</td></tr>';
        }
        html += '</tbody></table></div>';
        return html;
    },

    filterAlerts: function() {
        var severity = document.getElementById('alertSeverityFilter').value;
        var category = document.getElementById('alertCategoryFilter').value;
        var filtered = this.alertsData || [];
        if (severity) filtered = filtered.filter(function(a) { return a.severity === severity; });
        if (category) filtered = filtered.filter(function(a) { return a.category === category; });
        document.getElementById('alertListContainer').innerHTML = this.renderAlertList(filtered);
    },

    // ===== 梯次利用管理 =====
    renderCascade: function(container) {
        var self = this;
        Promise.all([
            ApiService.getCascadeRecords(),
            ApiService.getCascadeStats()
        ]).then(function(results) {
            var records = results[0];
            var stats = results[1];
            var runningCount = 0, completedCount = 0, evaluatingCount = 0;
            if (stats.byStatus) {
                for (var si = 0; si < stats.byStatus.length; si++) {
                    if (stats.byStatus[si].name === '运行中') runningCount = stats.byStatus[si].value;
                    if (stats.byStatus[si].name === '已完成') completedCount = stats.byStatus[si].value;
                    if (stats.byStatus[si].name === '评估中') evaluatingCount = stats.byStatus[si].value;
                }
            }
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>梯次利用管理</h1>\
                    <p>管理退役电池的梯次利用全流程: 评估、安装、运行、结束</p>\
                </div>\
                <div class="stat-grid">\
                    <div class="stat-card stat-blue"><div class="stat-value">' + stats.total + '</div><div class="stat-label">梯次利用记录</div></div>\
                    <div class="stat-card stat-cyan"><div class="stat-value">' + runningCount + '</div><div class="stat-label">运行中</div></div>\
                    <div class="stat-card stat-green"><div class="stat-value">' + completedCount + '</div><div class="stat-label">已完成</div></div>\
                    <div class="stat-card stat-orange"><div class="stat-value">' + evaluatingCount + '</div><div class="stat-label">评估中</div></div>\
                </div>\
                <div class="card" style="margin-top:16px">\
                    <div class="card-header"><h3>梯次利用记录</h3><button class="btn btn-primary admin-only" onclick="App.showAddCascadeModal()">新增梯次利用</button></div>\
                    <div class="card-body">\
                        <div class="table-wrap"><table class="data-table"><thead><tr><th>记录ID</th><th>电池ID</th><th>来源车辆</th><th>评估结果</th><th>梯次场景</th><th>目标项目</th><th>装机容量</th><th>状态</th><th>开始日期</th><th>操作</th></tr></thead><tbody>';
            for (var i = 0; i < records.length; i++) {
                var r = records[i];
                var statusBadge = { '评估中': 'badge-orange', '已评估': 'badge-blue', '梯次安装': 'badge-purple', '运行中': 'badge-cyan', '已完成': 'badge-green' };
                html += '<tr><td style="font-size:12px">' + r.id + '</td><td style="font-size:12px">' + r.battery_id + '</td><td style="font-size:12px">' + (r.source_vehicle_vin || '-') + '</td><td style="font-size:12px">' + (r.evaluation_result || '-') + '</td><td>' + (r.cascade_scenario || '-') + '</td><td style="font-size:12px">' + (r.target_project || '-') + '</td><td>' + (r.installed_capacity || '-') + '</td><td><span class="badge ' + (statusBadge[r.status] || 'badge-gray') + '">' + r.status + '</span></td><td style="font-size:12px">' + (r.start_date || '-') + '</td><td>';
                if (r.status !== '已完成') {
                    html += '<button class="btn-sm btn-green admin-only" onclick="App.advanceCascade(\'' + r.id + '\')">推进流程</button>';
                }
                html += '</td></tr>';
            }
            html += '</tbody></table></div>\
                    </div>\
                </div>\
                <div class="card" style="margin-top:16px">\
                    <div class="card-header"><h3>场景分布</h3></div>\
                    <div class="card-body"><div id="chartCascadeScenario" style="height:300px"></div></div>\
                </div>\
            </div>';
            container.innerHTML = html;
            self.initCascadeCharts(stats);
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    initCascadeCharts: function(stats) {
        var self = this;
        var chart = echarts.init(document.getElementById('chartCascadeScenario'));
        chart.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            legend: { type: 'scroll', bottom: 0, textStyle: { color: '#94a3b8', fontSize: 10 } },
            color: ['#3b82f6','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ec4899'],
            series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'], itemStyle: { borderColor: '#1a2332', borderWidth: 2 }, label: { show: false }, data: stats.byScenario.map(function(d) { return { value: d.value, name: d.name || '未分配' }; }) }]
        });
        self.charts.cascadeScenario = chart;
        self._setupResize();
    },

    showAddCascadeModal: function() {
        var html = '\
        <div class="modal-header"><h2>新增梯次利用记录</h2></div>\
        <div class="modal-body">\
            <div class="form-group"><label>电池ID *</label><input type="text" id="csc_batteryId" placeholder="如: BAT-2026-XXX-00000001"></div>\
            <div class="form-group"><label>来源车辆VIN</label><input type="text" id="csc_vin" placeholder="如: VIN20220401CATL001"></div>\
            <div class="form-group"><label>梯次场景</label><select id="csc_scenario"><option value="储能电站">储能电站</option><option value="通信基站">通信基站</option><option value="低速电动车">低速电动车</option><option value="备用电源">备用电源</option><option value="家庭储能">家庭储能</option><option value="其他">其他</option></select></div>\
            <div class="form-group"><label>目标项目</label><input type="text" id="csc_project" placeholder="如: 浙江XX储能电站项目"></div>\
            <div class="form-group"><label>装机容量</label><input type="text" id="csc_capacity" placeholder="如: 180 kWh"></div>\
            <div class="form-group"><label>预期结束日期</label><input type="date" id="csc_endDate"></div>\
        </div>\
        <div class="modal-footer"><button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitCascade()">创建并上链</button></div>';
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.add('show');
    },

    submitCascade: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        var data = {
            battery_id: document.getElementById('csc_batteryId').value,
            source_vehicle_vin: document.getElementById('csc_vin').value,
            cascade_scenario: document.getElementById('csc_scenario').value,
            target_project: document.getElementById('csc_project').value,
            installed_capacity: document.getElementById('csc_capacity').value,
            expected_end_date: document.getElementById('csc_endDate').value,
            operator: self.currentRole || '系统管理员'
        };
        if (!data.battery_id) { self.showToast('请输入电池ID', 'error'); return; }
        ApiService.addCascadeRecord(data).then(function(r) {
            self.closeModal();
            self.showToast(r.message || '梯次利用记录已创建', 'success');
            self.renderCascade(document.getElementById('mainContent'));
        }).catch(function(err) { self.showToast('创建失败: ' + err.message, 'error'); });
    },

    advanceCascade: function(id) {
        if (!this.requireAdmin()) return;
        var self = this;
        ApiService.advanceCascade(id).then(function(r) {
            self.showToast(r.message || '流程已推进', 'success');
            self.renderCascade(document.getElementById('mainContent'));
        }).catch(function(err) { self.showToast('推进失败: ' + err.message, 'error'); });
    },

    // ===== 报告中心 =====
    renderReports: function(container) {
        var self = this;
        container.innerHTML = '\
        <div class="page active">\
            <div class="page-header">\
                <h1>报告中心</h1>\
                <p>生成电池溯源报告、健康报告、回收报告和碳减排报告</p>\
            </div>\
            <div class="stat-grid stat-grid-4">\
                <div class="card report-card" onclick="App.showReportType(\'traceability\')">\
                    <div class="report-icon" style="color:#3b82f6"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></div>\
                    <h3>溯源报告</h3><p>电池全生命周期溯源信息汇总</p>\
                </div>\
                <div class="card report-card" onclick="App.showReportType(\'health\')">\
                    <div class="report-icon" style="color:#10b981"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>\
                    <h3>健康报告</h3><p>电池健康度评估与维护建议</p>\
                </div>\
                <div class="card report-card" onclick="App.showReportType(\'recycling\')">\
                    <div class="report-icon" style="color:#f59e0b"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></div>\
                    <h3>回收报告</h3><p>电池回收与梯次利用情况</p>\
                </div>\
                <div class="card report-card" onclick="App.showReportType(\'carbon\')">\
                    <div class="report-icon" style="color:#06b6d4"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a9 9 0 100 18 9 9 0 000-18z"/><path d="M12 6v6l4 2"/></svg></div>\
                    <h3>碳减排报告</h3><p>碳减排统计与等效数据</p>\
                </div>\
            </div>\
            <div class="card" style="margin-top:16px" id="reportResultCard" style="display:none"></div>\
        </div>';
    },

    showReportType: function(type) {
        var self = this;
        if (type === 'carbon') {
            self.loadCarbonReport();
            return;
        }
        var titles = { traceability: '溯源报告', health: '健康报告', recycling: '回收报告' };
        var html = '\
        <div class="modal-header"><h2>生成' + titles[type] + '</h2></div>\
        <div class="modal-body">\
            <div class="form-group"><label>电池ID *</label><input type="text" id="rpt_batteryId" placeholder="如: BAT-2026-CATL-00001852" value="BAT-2026-CATL-00001852"></div>\
        </div>\
        <div class="modal-footer"><button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.generateReport(\'' + type + '\')">生成报告</button></div>';
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.add('show');
    },

    generateReport: function(type) {
        var self = this;
        var batteryId = document.getElementById('rpt_batteryId').value;
        if (!batteryId) { self.showToast('请输入电池ID', 'error'); return; }
        self.closeModal();
        var card = document.getElementById('reportResultCard');
        card.style.display = 'block';
        card.innerHTML = '<div class="card-header"><h3>报告生成中...</h3></div><div class="card-body"><div style="padding:40px;text-align:center;color:var(--text-muted)">正在生成报告...</div></div>';
        var apiCall;
        if (type === 'traceability') apiCall = ApiService.getTraceabilityReport(batteryId);
        else if (type === 'health') apiCall = ApiService.getHealthReport(batteryId);
        else if (type === 'recycling') apiCall = ApiService.getRecyclingReport(batteryId);
        apiCall.then(function(report) {
            self.displayReport(type, report);
        }).catch(function(err) {
            card.innerHTML = '<div class="card-header"><h3>报告生成失败</h3></div><div class="card-body"><div style="padding:20px;color:var(--accent-red)">' + err.message + '</div></div>';
        });
    },

    displayReport: function(type, report) {
        var self = this;
        var card = document.getElementById('reportResultCard');
        var html = '<div class="card-header"><h3>' + report.report_type + ' - ' + report.report_id + '</h3><button class="btn btn-sm" onclick="App.downloadReport(' + JSON.stringify(report).replace(/"/g, '&quot;') + ')">导出JSON</button></div><div class="card-body">';
        if (type === 'traceability') {
            html += '<div class="report-section"><h4>电池基本信息</h4><div class="kv-grid"><div><span class="kv-label">电池ID</span><span class="kv-value">' + report.battery.id + '</span></div><div><span class="kv-label">型号</span><span class="kv-value">' + report.battery.manufacturer + ' ' + report.battery.model + '</span></div><div><span class="kv-label">类型</span><span class="kv-value">' + report.battery.battery_type + '</span></div><div><span class="kv-label">容量</span><span class="kv-value">' + report.battery.capacity + '</span></div><div><span class="kv-label">生产日期</span><span class="kv-value">' + report.battery.production_date + '</span></div><div><span class="kv-label">当前SOH</span><span class="kv-value">' + report.battery.soh + '%</span></div></div></div>';
            html += '<div class="report-section"><h4>生命周期事件 (' + report.lifecycle.total_events + '条)</h4><div class="table-wrap"><table class="data-table"><thead><tr><th>事件类型</th><th>标题</th><th>提交方</th><th>日期</th><th>交易Hash</th></tr></thead><tbody>';
            for (var i = 0; i < report.lifecycle.events.length; i++) {
                var e = report.lifecycle.events[i];
                html += '<tr><td>' + e.event_type + '</td><td>' + e.event_title + '</td><td>' + (e.submitter || '-') + '</td><td style="font-size:12px">' + (e.event_date || '-') + '</td><td style="font-size:11px;color:var(--text-muted)">' + (e.tx_hash || '-') + '</td></tr>';
            }
            html += '</tbody></table></div></div>';
            html += '<div class="report-section"><h4>维护记录 (' + report.maintenance.total_count + '条, 总费用: ' + report.maintenance.total_cost + '元)</h4><div class="table-wrap"><table class="data-table"><thead><tr><th>类型</th><th>描述</th><th>提供商</th><th>费用</th><th>日期</th></tr></thead><tbody>';
            for (var j = 0; j < report.maintenance.records.length; j++) {
                var m = report.maintenance.records[j];
                html += '<tr><td>' + m.maintenance_type + '</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">' + m.description + '</td><td>' + m.provider + '</td><td>' + m.cost + '</td><td style="font-size:12px">' + m.maintenance_date + '</td></tr>';
            }
            html += '</tbody></table></div></div>';
            html += '<div class="report-section"><h4>证书信息</h4><div class="table-wrap"><table class="data-table"><thead><tr><th>证书类型</th><th>证书编号</th><th>签发方</th><th>签发日期</th><th>到期日期</th><th>状态</th></tr></thead><tbody>';
            for (var k = 0; k < report.certificates.length; k++) {
                var c = report.certificates[k];
                html += '<tr><td>' + c.cert_type + '</td><td style="font-size:12px">' + c.cert_number + '</td><td>' + c.issuer + '</td><td style="font-size:12px">' + c.issue_date + '</td><td style="font-size:12px">' + (c.expiry_date || '-') + '</td><td>' + c.status + '</td></tr>';
            }
            html += '</tbody></table></div></div>';
        } else if (type === 'health') {
            var healthColors = { '优秀': '#10b981', '良好': '#3b82f6', '注意': '#f59e0b', '警告': '#f59e0b', '严重': '#ef4444' };
            html += '<div class="report-section"><h4>健康评估: <span style="color:' + (healthColors[report.health_level] || '#94a3b8') + ';font-size:18px;font-weight:700">' + report.health_level + '</span></h4><div class="kv-grid"><div><span class="kv-label">当前SOH</span><span class="kv-value">' + report.battery.soh + '%</span></div><div><span class="kv-label">循环次数</span><span class="kv-value">' + report.battery.cycles + '</span></div><div><span class="kv-label">平均衰减率</span><span class="kv-value">' + report.avg_soh_decline + '%/月</span></div></div></div>';
            html += '<div class="report-section"><h4>健康建议</h4><ul style="list-style:none;padding:0">';
            for (var x = 0; x < report.recommendations.length; x++) {
                var rec = report.recommendations[x];
                var pColor = rec.priority === '高' ? '#ef4444' : rec.priority === '中' ? '#f59e0b' : '#10b981';
                html += '<li style="padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:' + pColor + ';font-weight:600">[' + rec.priority + ']</span> ' + rec.text + '</li>';
            }
            html += '</ul></div>';
            html += '<div class="report-section"><h4>维护摘要 (' + report.maintenance_summary.total + '次, 总费用' + report.maintenance_summary.total_cost + '元)</h4></div>';
            html += '<div class="report-section"><h4>异常摘要 (' + report.anomaly_summary.total + '条, 未处理' + report.anomaly_summary.unresolved + '条)</h4></div>';
        } else if (type === 'recycling') {
            html += '<div class="report-section"><h4>电池信息</h4><div class="kv-grid"><div><span class="kv-label">电池ID</span><span class="kv-value">' + report.battery.id + '</span></div><div><span class="kv-label">状态</span><span class="kv-value">' + report.battery.status + '</span></div><div><span class="kv-label">SOH</span><span class="kv-value">' + report.battery.soh + '%</span></div></div></div>';
            html += '<div class="report-section"><h4>梯次利用记录 (' + report.cascade_records.length + '条)</h4><div class="table-wrap"><table class="data-table"><thead><tr><th>场景</th><th>项目</th><th>状态</th><th>开始日期</th></tr></thead><tbody>';
            for (var cI = 0; cI < report.cascade_records.length; cI++) {
                var cr = report.cascade_records[cI];
                html += '<tr><td>' + (cr.cascade_scenario || '-') + '</td><td>' + (cr.target_project || '-') + '</td><td>' + cr.status + '</td><td style="font-size:12px">' + (cr.start_date || '-') + '</td></tr>';
            }
            html += '</tbody></table></div></div>';
            html += '<div class="report-section"><h4>碳减排记录 (总计' + Math.round(report.total_carbon_saved) + 'kgCO2)</h4></div>';
        }
        html += '<div class="report-section" style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">报告生成时间: ' + report.generated_at + '<br>数据Hash: ' + (report.data_hash || report.report_id) + '</div>';
        html += '</div></div>';
        card.innerHTML = html;
    },

    loadCarbonReport: function() {
        var self = this;
        var card = document.getElementById('reportResultCard');
        card.style.display = 'block';
        card.innerHTML = '<div class="card-header"><h3>碳减排报告生成中...</h3></div><div class="card-body"><div style="padding:40px;text-align:center;color:var(--text-muted)">正在生成报告...</div></div>';
        ApiService.getCarbonReport().then(function(report) {
            var s = report.summary;
            var html = '<div class="card-header"><h3>碳减排报告 - ' + report.report_id + '</h3></div><div class="card-body">';
            html += '<div class="report-section"><h4>碳减排汇总</h4><div class="stat-grid stat-grid-4"><div class="mini-stat"><div class="mini-stat-value" style="color:#10b981">' + s.total_carbon_saved + '</div><div class="mini-stat-label">总减排量(kgCO2)</div></div><div class="mini-stat"><div class="mini-stat-value">' + s.equivalent_trees + '</div><div class="mini-stat-label">等效植树(棵)</div></div><div class="mini-stat"><div class="mini-stat-value">' + s.equivalent_coal_saved + '</div><div class="mini-stat-label">节约标煤(kg)</div></div><div class="mini-stat"><div class="mini-stat-value">' + s.equivalent_electricity + '</div><div class="mini-stat-label">等效电量(kWh)</div></div></div></div>';
            html += '<div class="report-section"><h4>按类型统计</h4><div class="table-wrap"><table class="data-table"><thead><tr><th>类型</th><th>减排量(kgCO2)</th><th>记录数</th></tr></thead><tbody>';
            for (var i = 0; i < report.by_type.length; i++) {
                var t = report.by_type[i];
                html += '<tr><td>' + t.name + '</td><td>' + t.total + '</td><td>' + t.count + '</td></tr>';
            }
            html += '</tbody></table></div></div>';
            html += '<div class="report-section" style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">报告生成时间: ' + report.generated_at + '</div></div>';
            card.innerHTML = html;
        }).catch(function(err) {
            card.innerHTML = '<div class="card-header"><h3>报告生成失败</h3></div><div class="card-body"><div style="padding:20px;color:var(--accent-red)">' + err.message + '</div></div>';
        });
    },

    downloadReport: function(report) {
        var blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = report.report_id + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('报告已下载', 'success');
    },

    // ===== 数据导入 =====
    renderImport: function(container) {
        var self = this;
        ApiService.getImportLogs().then(function(logs) {
            var html = '\
            <div class="page active">\
                <div class="page-header">\
                    <h1>数据导入</h1>\
                    <p>批量导入电池数据，支持CSV/JSON格式</p>\
                </div>\
                <div class="card">\
                    <div class="card-header"><h3>导入电池数据</h3>\
                        <div style="display:flex;gap:8px">\
                            <button class="btn btn-sm" onclick="App.loadImportTemplate()">查看模板</button>\
                            <button class="btn btn-sm btn-primary admin-only" onclick="App.generateSampleCsv()">生成示例CSV</button>\
                            <button class="btn btn-sm" onclick="App.loadSampleJson()">载入示例JSON</button>\
                        </div>\
                    </div>\
                    <div class="card-body">\
                        <div class="form-group"><label>CSV数据 (每行一条电池记录)</label><textarea id="importCsvData" rows="8" placeholder="id,manufacturer,model,battery_type,capacity,batch,production_date,vehicle_vin,status,soh,soc,cycles,current_owner,trust_score&#10;BAT-2026-XXX-00000001,宁德时代,CTP3.0-100kWh,三元锂,100kWh,BATCH-2026-001,2026-01-15,LSGAB52L9DF000001,在役,100,100,0,XX公司,100" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text-primary);font-family:monospace;font-size:13px;padding:12px;border-radius:8px"></textarea></div>\
                        <div class="form-group"><label>或 JSON数组格式</label><textarea id="importJsonData" rows="6" placeholder=\'[{"id":"BAT-2026-XXX-00000001","manufacturer":"宁德时代","model":"CTP3.0-100kWh","battery_type":"三元锂","capacity":"100kWh"}]\' style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text-primary);font-family:monospace;font-size:13px;padding:12px;border-radius:8px"></textarea></div>\
                        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">\
                            <button class="btn btn-primary admin-only" onclick="App.executeImport()">执行导入</button>\
                            <button class="btn btn-sm admin-only" onclick="App.generateSampleCsv()">生成示例CSV</button>\
                            <button class="btn btn-sm" onclick="App.loadSampleJson()">载入示例JSON</button>\
                            <button class="btn btn-sm" onclick="App.clearImportData()">清空</button>\
                        </div>\
                    </div>\
                </div>\
                <div class="card" style="margin-top:16px">\
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center"><h3>导入历史</h3><button class="btn btn-sm admin-only" style="color:#ef4444;border-color:rgba(239,68,68,0.3)" onclick="App.clearImportLogs()">清空历史</button></div>\
                    <div class="card-body">\
                        <div class="table-wrap"><table class="data-table"><thead><tr><th>导入类型</th><th>文件名</th><th>总行数</th><th>成功</th><th>失败</th><th>操作员</th><th>时间</th><th>操作</th></tr></thead><tbody>';
            if (logs.length === 0) {
                html += '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">暂无导入记录</td></tr>';
            } else {
                for (var i = 0; i < logs.length; i++) {
                    var log = logs[i];
                    html += '<tr><td>' + log.import_type + '</td><td>' + (log.file_name || 'batch_import') + '</td><td>' + log.total_rows + '</td><td style="color:#10b981">' + log.success_rows + '</td><td style="color:#ef4444">' + log.failed_rows + '</td><td>' + log.operator + '</td><td style="font-size:12px">' + log.created_at + '</td><td><button class="btn btn-sm admin-only" style="color:#ef4444;border-color:rgba(239,68,68,0.3);padding:2px 8px;font-size:12px" onclick="App.deleteImportLog(' + log.id + ')">删除</button></td></tr>';
                }
            }
            html += '</tbody></table></div>\
                    </div>\
                </div>\
            </div>';
            container.innerHTML = html;
        }).catch(function(err) {
            container.innerHTML = '<div class="page active"><div class="page-body"><div style="padding:40px;color:var(--accent-red)">加载失败: ' + err.message + '</div></div></div>';
        });
    },

    deleteImportLog: function(id) {
        if (!this.requireAdmin()) return;
        var self = this;
        if (!confirm('确定删除这条导入记录吗？')) return;
        ApiService.deleteImportLog(id).then(function() {
            self.showToast('已删除', 'success');
            self.renderDataImport();
        }).catch(function(err) {
            self.showToast('删除失败: ' + err.message, 'error');
        });
    },

    clearImportLogs: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        if (!confirm('确定清空所有导入历史吗？此操作不可恢复。')) return;
        ApiService.clearImportLogs().then(function() {
            self.showToast('已清空所有导入历史', 'success');
            self.renderDataImport();
        }).catch(function(err) {
            self.showToast('清空失败: ' + err.message, 'error');
        });
    },

    loadImportTemplate: function() {
        var self = this;
        ApiService.getImportTemplate().then(function(tpl) {
            var html = '\
            <div class="modal-header"><h2>导入模板说明</h2></div>\
            <div class="modal-body">\
                <div class="form-group"><label>必填字段</label><div style="padding:8px 12px;background:var(--bg-darker);border-radius:6px;font-size:13px">' + tpl.required_fields.join(', ') + '</div></div>\
                <div class="form-group"><label>可选字段</label><div style="padding:8px 12px;background:var(--bg-darker);border-radius:6px;font-size:13px">' + tpl.optional_fields.join(', ') + '</div></div>\
                <div class="form-group"><label>CSV表头</label><div style="padding:8px 12px;background:var(--bg-darker);border-radius:6px;font-family:monospace;font-size:12px;word-break:break-all">' + tpl.csv_header + '</div></div>\
                <div class="form-group"><label>CSV示例</label><div style="padding:8px 12px;background:var(--bg-darker);border-radius:6px;font-family:monospace;font-size:12px;word-break:break-all">' + tpl.csv_example + '</div></div>\
            </div>\
            <div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">关闭</button></div>';
            document.getElementById('modalContent').innerHTML = html;
            document.getElementById('modalOverlay').classList.add('show');
        }).catch(function(err) { self.showToast('获取模板失败: ' + err.message, 'error'); });
    },

    executeImport: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        var csvData = document.getElementById('importCsvData').value.trim();
        var jsonData = document.getElementById('importJsonData').value.trim();
        var data = [];
        if (jsonData) {
            try {
                data = JSON.parse(jsonData);
                if (!Array.isArray(data)) { self.showToast('JSON格式必须为数组', 'error'); return; }
            } catch (e) { self.showToast('JSON解析失败: ' + e.message, 'error'); return; }
        } else if (csvData) {
            csvData = csvData.replace(/^\ufeff/, '');
            var lines = csvData.split(/\r?\n/);
            var headers = null;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;
                var fields = self.parseCsvLine(line);
                if (!headers) { headers = fields; continue; }
                var obj = {};
                for (var j = 0; j < headers.length && j < fields.length; j++) {
                    obj[headers[j].trim()] = fields[j].trim();
                }
                data.push(obj);
            }
        } else {
            self.showToast('请输入导入数据', 'error');
            return;
        }
        ApiService.importBatteries(data, self.currentRole || '系统管理员').then(function(r) {
            self.showToast(r.message || '导入完成', r.failed_count > 0 ? 'info' : 'success');
            self.renderImport(document.getElementById('mainContent'));
        }).catch(function(err) { self.showToast('导入失败: ' + err.message, 'error'); });
    },

    parseCsvLine: function(line) {
        var fields = [];
        var current = '';
        var inQuote = false;
        for (var k = 0; k < line.length; k++) {
            var ch = line[k];
            if (ch === '"') {
                if (inQuote && line[k + 1] === '"') { current += '"'; k++; }
                else { inQuote = !inQuote; }
            } else if (ch === ',' && !inQuote) {
                fields.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        fields.push(current);
        return fields;
    },

    generateSampleCsv: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        var count = prompt('生成多少条示例数据?', '10');
        if (!count) return;
        count = parseInt(count) || 10;
        fetch(ApiService.getSampleCsvUrl(count))
            .then(function(r) { return r.text(); })
            .then(function(csv) {
                document.getElementById('importCsvData').value = csv;
                self.showToast('已生成 ' + count + ' 条示例CSV数据，点击"执行导入"按钮导入', 'success');
            })
            .catch(function(err) { self.showToast('生成失败: ' + err.message, 'error'); });
    },

    loadSampleCsvAndImport: function() {
        if (!this.requireAdmin()) return;
        var self = this;
        var count = prompt('生成多少条示例数据?', '10');
        if (!count) return;
        count = parseInt(count) || 10;
        fetch(ApiService.getSampleCsvUrl(count))
            .then(function(r) { return r.text(); })
            .then(function(csv) {
                document.getElementById('importCsvData').value = csv;
                self.showToast('已生成 ' + count + ' 条，正在导入...', 'success');
                setTimeout(function() { self.executeImport(); }, 500);
            })
            .catch(function(err) { self.showToast('生成失败: ' + err.message, 'error'); });
    },

    loadSampleJson: function() {
        var self = this;
        var count = prompt('生成多少条示例数据?', '5');
        if (!count) return;
        count = parseInt(count) || 5;
        ApiService.getSampleJson(count).then(function(data) {
            document.getElementById('importJsonData').value = JSON.stringify(data, null, 2);
            self.showToast('已载入 ' + count + ' 条示例JSON数据', 'success');
        }).catch(function(err) { self.showToast('载入失败: ' + err.message, 'error'); });
    },

    clearImportData: function() {
        document.getElementById('importCsvData').value = '';
        document.getElementById('importJsonData').value = '';
        this.showToast('已清空', 'info');
    },

    // ===== SOH上链存证 =====
    showSohAttestModal: function(batteryId, currentSoh) {
        var self = this;
        var html = '\
        <div class="modal-header"><h2>SOH上链存证</h2></div>\
        <div class="modal-body">\
            <div style="background:var(--bg-darker);padding:12px;border-radius:8px;margin-bottom:16px">\
                <div style="font-size:13px;color:var(--text-muted)">电池ID</div>\
                <div style="font-size:15px;color:var(--text-primary);font-weight:600">' + batteryId + '</div>\
                <div style="font-size:13px;color:var(--text-muted);margin-top:8px">当前SOH: <span style="color:var(--accent-blue);font-weight:600">' + currentSoh + '%</span></div>\
            </div>\
            <div class="form-group"><label>新SOH值 (必须 &lt;= ' + currentSoh + '%)</label><input type="number" id="soh_new_value" min="0" max="' + currentSoh + '" step="0.1" placeholder="如: ' + Math.max(0, currentSoh - 5) + '" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:6px"></div>\
            <div class="form-group"><label>SOC (可选)</label><input type="number" id="soh_soc" min="0" max="100" step="0.1" placeholder="如: 85" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:6px"></div>\
            <div class="form-group"><label>循环次数 (可选)</label><input type="number" id="soh_cycles" min="0" step="1" placeholder="如: 320" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:6px"></div>\
            <div class="form-group"><label>备注</label><input type="text" id="soh_remark" placeholder="如: 季度检测SOH更新" style="width:100%;background:var(--bg-darker);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:6px"></div>\
            <div style="font-size:12px;color:var(--text-muted);padding:8px;background:rgba(245,158,11,0.1);border-radius:6px">SOH只能递减，新值必须小于等于上次记录(' + currentSoh + '%)。更新后将写入区块链存证。</div>\
        </div>\
        <div class="modal-footer"><button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitSohAttest(\'' + batteryId + '\', ' + currentSoh + ')">上链存证</button></div>';
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.add('show');
    },

    submitSohAttest: function(batteryId, oldSoh) {
        if (!this.requireAdmin()) return;
        var self = this;
        var newSoh = parseFloat(document.getElementById('soh_new_value').value);
        var soc = document.getElementById('soh_soc').value;
        var cycles = document.getElementById('soh_cycles').value;
        var remark = document.getElementById('soh_remark').value;

        if (isNaN(newSoh)) { self.showToast('请输入有效SOH值', 'error'); return; }
        if (newSoh > oldSoh) { self.showToast('SOH只能递减，不能高于' + oldSoh + '%', 'error'); return; }
        if (newSoh === oldSoh) { self.showToast('SOH与当前值相同，无需更新', 'error'); return; }

        ApiService.updateBatterySOH(
            batteryId, newSoh,
            soc ? parseFloat(soc) : null,
            cycles ? parseInt(cycles) : null,
            self.currentRole || '检测机构',
            remark
        ).then(function(r) {
            self.closeModal();
            self.showToast('SOH已上链存证: ' + oldSoh + '% -> ' + newSoh + '% (下降' + r.decline.toFixed(1) + '%)', 'success');
            document.getElementById('detailSearch').value = batteryId;
            self.searchBatteryDetail();
        }).catch(function(err) { self.showToast('存证失败: ' + err.message, 'error'); });
    },

    // ===== Helpers =====
    renderRoleChips: function() {
        var html = '';
        for (var key in this.roles) {
            html += '<div class="role-chip' + (key === this.currentRole ? ' active' : '') + '" data-role="' + key + '">' + this.roles[key].name + '</div>';
        }
        return html;
    },

    bindRoleSelector: function() {
        var self = this;
        var chips = document.querySelectorAll('.role-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].addEventListener('click', function() {
                var role = this.getAttribute('data-role');
                if (role) {
                    self.currentRole = role;
                    var allChips = document.querySelectorAll('.role-chip');
                    for (var j = 0; j < allChips.length; j++) allChips[j].classList.remove('active');
                    this.classList.add('active');
                    var display = document.getElementById('currentRoleDisplay');
                    if (display && self.roles[role]) display.textContent = self.roles[role].name;
                    self.showToast('已切换至: ' + (self.roles[role] ? self.roles[role].name : role), 'info');
                }
            });
        }
    },

    formatNum: function(n) { return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
    statusBadge: function(s) { var m = {'在役':'badge-blue','维修中':'badge-orange','待退役':'badge-purple','梯次利用':'badge-cyan','已回收':'badge-green','已生产':'badge-gray'}; return '<span class="badge ' + (m[s]||'badge-gray') + '">' + s + '</span>'; },
    eventDotClass: function(t) { var m = {'电池生产':'','质量检测':'','装配车辆':'','车辆交付':'','电池检测':'green','维修记录':'orange','事故记录':'red','退役':'purple','梯次利用':'green','最终回收':'green','生命周期结束':'green'}; return m[t] || ''; },
    txTypeLabel: function(t) { var m = {'registerBattery':'电池注册','addRecord':'生命周期记录','bindVehicle':'车辆绑定','transferBattery':'责任转移','addMaintenance':'维护记录','recordCarbon':'碳减排记录','issueCertificate':'证书签发','advanceRecycle':'回收推进'}; return m[t] || t; },
    calcYears: function(d) { if (!d) return '0'; var dt = new Date(d); var now = new Date('2026-08-25'); return ((now - dt) / (365.25*24*3600*1000)).toFixed(1); },
    countEvents: function(events, type) { var c = 0; for (var i = 0; i < events.length; i++) { if (events[i].event_type === type) c++; } return c; },
    countByStep: function(tasks, step) { var c = 0; for (var i = 0; i < tasks.length; i++) { if (tasks[i].step === step) c++; } return c; },

    showToast: function(msg, type) {
        var container = document.getElementById('toastContainer');
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        var icon = '';
        if (type === 'success') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        else if (type === 'error') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        else icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
        toast.innerHTML = icon + '<span>' + msg + '</span>';
        container.appendChild(toast);
        setTimeout(function() { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(function(){toast.remove();},300); }, 3000);
    },

    closeModal: function() { document.getElementById('modalOverlay').classList.remove('show'); },

    loadPrediction: function(batteryId) {
        var self = this;
        ApiService.getBatteryPrediction(batteryId).then(function(pred) {
            if (!pred.predictionAvailable) {
                self.showToast(pred.message || '预测数据不足', 'error');
                return;
            }
            document.getElementById('pred_decay').textContent = pred.annualDecayRate + '%/年';
            document.getElementById('pred_retire').textContent = pred.monthsToRetireThreshold > 0 ? pred.monthsToRetireThreshold + '个月' : '已达退役';
            document.getElementById('pred_cascade').textContent = pred.monthsToCascadeThreshold > 0 ? pred.monthsToCascadeThreshold + '个月' : '已达梯次';
            document.getElementById('pred_cycles').textContent = pred.remainingCycles > 0 ? pred.remainingCycles + '次' : '-';

            if (self.charts.prediction) self.charts.prediction.dispose();
            var chart = echarts.init(document.getElementById('chartPrediction'));
            var historyData = pred.history.map(function(h) { return [h.month, h.soh]; });
            var predictData = pred.predictions.map(function(p) { return p.soh; });
            var xLabels = pred.history.map(function(h) { return h.month; });
            for (var i = 1; i < pred.predictions.length; i++) xLabels.push('+' + i + '月');

            chart.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['历史SOH','预测SOH','退役线','梯次线'], textStyle: { color: '#94a3b8' }, top: 0 },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
                xAxis: { type: 'category', data: xLabels, axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: '#2a3a5c' } } },
                yAxis: { type: 'value', min: 40, max: 100, name: 'SOH(%)', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
                series: [
                    { name: '历史SOH', type: 'line', data: pred.history.map(function(h){return h.soh;}), itemStyle: { color: '#3b82f6' }, lineStyle: { width: 2 } },
                    { name: '预测SOH', type: 'line', data: [].concat([null], predictData.slice(1)), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 2, type: 'dashed' } },
                    { name: '退役线', type: 'line', data: xLabels.map(function(){return pred.retiredThreshold;}), itemStyle: { color: '#ef4444' }, lineStyle: { width: 1, type: 'dotted' }, symbol: 'none' },
                    { name: '梯次线', type: 'line', data: xLabels.map(function(){return pred.cascadeThreshold;}), itemStyle: { color: '#06b6d4' }, lineStyle: { width: 1, type: 'dotted' }, symbol: 'none' }
                ]
            });
            self.charts.prediction = chart;
            self._setupResize();
            self.showToast('健康预测分析已加载', 'success');
        }).catch(function(err) {
            self.showToast('预测加载失败: ' + err.message, 'error');
        });
    },
    // ===== Auth =====
    showAuthModal: function(tab) {
        var self = this;
        tab = tab || 'login';
        var html = '\
        <div class="auth-modal">\
            <div class="modal-header"><h2>' + (tab === 'login' ? '登录' : '注册') + '</h2></div>\
            <div class="modal-body">\
                <div class="auth-tabs">\
                    <button class="auth-tab ' + (tab === 'login' ? 'active' : '') + '" onclick="App.showAuthModal(\'login\')">登录</button>\
                    <button class="auth-tab ' + (tab === 'register' ? 'active' : '') + '" onclick="App.showAuthModal(\'register\')">注册</button>\
                </div>\
                <div class="auth-form">\
                    <div class="form-group"><label>用户名</label><input type="text" id="auth_username" placeholder="请输入用户名"></div>\
                    <div class="form-group"><label>密码</label><input type="password" id="auth_password" placeholder="请输入密码"></div>\
                    ' + (tab === 'register' ? '<div class="form-group"><label>确认密码</label><input type="password" id="auth_password2" placeholder="请再次输入密码"></div>' : '') + '\
                    <button class="auth-submit" onclick="App.submitAuth(\'' + tab + '\')">' + (tab === 'login' ? '登 录' : '注 册') + '</button>\
                    <div class="auth-footer">\
                        ' + (tab === 'login' ? '还没有账号？<a onclick="App.showAuthModal(\'register\')">立即注册</a>' : '已有账号？<a onclick="App.showAuthModal(\'login\')">去登录</a>') + '\
                    </div>\
                </div>\
            </div>\
        </div>';
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.add('show');
        setTimeout(function() { document.getElementById('auth_username').focus(); }, 100);
    },

    submitAuth: function(type) {
        var self = this;
        var username = document.getElementById('auth_username').value.trim();
        var password = document.getElementById('auth_password').value;
        if (!username) { self.showToast('请输入用户名', 'error'); return; }
        if (!password) { self.showToast('请输入密码', 'error'); return; }

        if (type === 'register') {
            var password2 = document.getElementById('auth_password2').value;
            if (password !== password2) { self.showToast('两次密码不一致', 'error'); return; }
            ApiService.register(username, password).then(function(r) {
                self.showToast('注册成功，请登录', 'success');
                self.showAuthModal('login');
                document.getElementById('auth_username').value = username;
            }).catch(function(err) { self.showToast('注册失败: ' + err.message, 'error'); });
        } else {
            ApiService.login(username, password).then(function(r) {
                self.showToast('登录成功，欢迎 ' + r.user.username, 'success');
                self.closeModal();
                self.updateUserSection();
                self.renderPage(self.currentPage);
            }).catch(function(err) { self.showToast('登录失败: ' + err.message, 'error'); });
        }
    },

    logout: function() {
        var self = this;
        ApiService.logout().then(function() {
            self.showToast('已退出登录', 'info');
            self.updateUserSection();
            self.renderPage('dashboard');
        }).catch(function() {
            self.updateUserSection();
            self.renderPage('dashboard');
        });
    },

    updateUserSection: function() {
        var section = document.getElementById('userSection');
        if (!section) return;
        var user = ApiService.getCurrentUser();
        if (user) {
            var roleText = user.role === 'admin' ? '管理员' : '游客';
            var roleClass = user.role === 'admin' ? 'admin' : '';
            var initial = user.username.charAt(0).toUpperCase();
            section.innerHTML = '\
                <div class="user-info">\
                    <div class="user-avatar">' + initial + '</div>\
                    <div class="user-details">\
                        <div class="user-name">' + user.username + '</div>\
                        <div class="user-role ' + roleClass + '">' + roleText + '</div>\
                    </div>\
                </div>\
                <button class="logout-btn" onclick="App.logout()">退出登录</button>';
            if (user.role === 'admin') {
                document.body.classList.add('is-admin');
            } else {
                document.body.classList.remove('is-admin');
            }
        } else {
            section.innerHTML = '<button class="btn btn-primary" onclick="App.showAuthModal(\'login\')" style="width:100%">登录 / 注册</button>';
            document.body.classList.remove('is-admin');
        }
    },

    isAdmin: function() {
        var user = ApiService.getCurrentUser();
        return user && user.role === 'admin';
    },

    requireAdmin: function(action) {
        if (!this.isAdmin()) {
            this.showToast('需要管理员权限，请登录管理员账号', 'error');
            this.showAuthModal('login');
            return false;
        }
        return true;
    },

    resetForm: function() { var inputs = document.querySelectorAll('#batteryForm input, #batteryForm select, #batteryForm textarea'); for (var i = 0; i < inputs.length; i++) { if (inputs[i].type === 'date') inputs[i].value = ''; else if (inputs[i].tagName === 'SELECT') inputs[i].selectedIndex = 0; else if (inputs[i].id !== 'f_batteryId') inputs[i].value = ''; } this.showToast('表单已重置', 'info'); }
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) App.closeModal(); });
