// Analytics functionality
const analytics = {
  charts: {},

  // Initialize analytics screen
  async init() {
    const currentAuctionId = await loadCurrentAuction();
    if (!currentAuctionId) {
      document.querySelector('#analyticsScreen .analytics-grid').innerHTML = '<div class="empty-state">No active auction</div>';
      return;
    }

    await this.loadStageChart(currentAuctionId);
    await this.loadExclusionChart(currentAuctionId);
    await this.loadScoreChart(currentAuctionId);
    await this.loadCityBreakdown(currentAuctionId);
  },

  // Stage progress chart
  async loadStageChart(auctionId) {
    const stats = await db.getAuctionStats(auctionId);

    const ctx = document.getElementById('stageChart');
    if (this.charts.stage) {
      this.charts.stage.destroy();
    }

    this.charts.stage = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'],
        datasets: [{
          label: 'Completed',
          data: [
            stats.stage1Complete,
            stats.stage2Complete,
            stats.stage3Complete,
            stats.stage4Complete,
            stats.stage5Complete
          ],
          backgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  },

  // Exclusion breakdown chart
  async loadExclusionChart(auctionId) {
    const breakdown = await db.getExclusionBreakdown(auctionId);

    const ctx = document.getElementById('exclusionChart');
    if (this.charts.exclusion) {
      this.charts.exclusion.destroy();
    }

    const labels = Object.keys(breakdown);
    const data = Object.values(breakdown);

    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'
    ];

    this.charts.exclusion = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  },

  // Score distribution chart
  async loadScoreChart(auctionId) {
    const properties = await db.getProperties(auctionId, { isExcluded: false });

    // Group by score ranges
    const ranges = {
      '0-2': 0,
      '2-4': 0,
      '4-6': 0,
      '6-8': 0,
      '8-10': 0
    };

    properties.forEach(p => {
      const score = p.auto_score || 0;
      if (score < 2) ranges['0-2']++;
      else if (score < 4) ranges['2-4']++;
      else if (score < 6) ranges['4-6']++;
      else if (score < 8) ranges['6-8']++;
      else ranges['8-10']++;
    });

    const ctx = document.getElementById('scoreChart');
    if (this.charts.score) {
      this.charts.score.destroy();
    }

    this.charts.score = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(ranges),
        datasets: [{
          label: 'Properties',
          data: Object.values(ranges),
          backgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  },

  // City breakdown table
  async loadCityBreakdown(auctionId) {
    const breakdown = await db.getCityBreakdown(auctionId);

    const cityDiv = document.getElementById('cityBreakdown');

    const sorted = Object.entries(breakdown)
      .sort((a, b) => b[1].total - a[1].total);

    let html = '<table class="city-table"><thead><tr><th>City</th><th>Total</th><th>Active</th><th>Excluded</th></tr></thead><tbody>';

    sorted.forEach(([city, stats]) => {
      html += `
        <tr>
          <td>${city}</td>
          <td>${stats.total}</td>
          <td class="text-success">${stats.active}</td>
          <td class="text-danger">${stats.excluded}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    cityDiv.innerHTML = html;
  }
};
