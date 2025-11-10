// Main application logic
const app = {
  currentScreen: 'dashboard',

  // Initialize app
  init() {
    this.checkAuth();

    // Enter key on password input
    document.getElementById('passwordInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.login();
      }
    });

    // Close modal on click outside
    window.onclick = (event) => {
      const modal = document.getElementById('propertyModal');
      if (event.target === modal) {
        this.closeModal();
      }
    };
  },

  // Check authentication
  checkAuth() {
    const auth = localStorage.getItem('auctionAuth');
    if (auth === 'authenticated') {
      this.showMainApp();
    } else {
      this.showLoginScreen();
    }
  },

  // Login
  login() {
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('loginError');

    if (password === config.password) {
      localStorage.setItem('auctionAuth', 'authenticated');
      this.showMainApp();
    } else {
      errorDiv.textContent = 'Incorrect password';
      setTimeout(() => {
        errorDiv.textContent = '';
      }, 3000);
    }
  },

  // Logout
  logout() {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('auctionAuth');
      location.reload();
    }
  },

  // Show login screen
  showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  },

  // Show main app
  showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    this.showScreen('dashboard');
  },

  // Show specific screen
  async showScreen(screenName) {
    this.currentScreen = screenName;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.screen === screenName) {
        btn.classList.add('active');
      }
    });

    // Update screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(`${screenName}Screen`).classList.add('active');

    // Load screen-specific data
    switch (screenName) {
      case 'dashboard':
        await this.loadDashboard();
        break;
      case 'workflow':
        await workflow.showStage(1);
        break;
      case 'review':
        await review.init();
        break;
      case 'analytics':
        await analytics.init();
        break;
    }
  },

  // Load dashboard
  async loadDashboard() {
    const auction = await db.getActiveAuction();

    if (!auction) {
      document.getElementById('activeAuction').textContent = 'No Active Auction';
      document.getElementById('totalProperties').textContent = '0';
      document.getElementById('excludedProperties').textContent = '0';
      document.getElementById('readyToBid').textContent = '0';
      document.getElementById('budgetRemaining').textContent = '$0';
      document.getElementById('daysUntilAuction').textContent = '-';
      return;
    }

    // Display auction info
    document.getElementById('activeAuction').textContent = auction.auction_month;

    // Get stats
    const stats = await db.getAuctionStats(auction.id);

    document.getElementById('totalProperties').textContent = stats.total;
    document.getElementById('excludedProperties').textContent = stats.excluded;
    document.getElementById('readyToBid').textContent = stats.readyToBid;

    const budgetRemaining = (auction.budget_total || 1000000) - (auction.budget_spent || 0);
    document.getElementById('budgetRemaining').textContent = '$' + budgetRemaining.toLocaleString();

    // Calculate days until auction
    if (auction.auction_date) {
      const today = new Date();
      const auctionDate = new Date(auction.auction_date);
      const diffTime = auctionDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        document.getElementById('daysUntilAuction').textContent = diffDays;
      } else if (diffDays === 0) {
        document.getElementById('daysUntilAuction').textContent = 'Today!';
      } else {
        document.getElementById('daysUntilAuction').textContent = 'Past';
      }
    }

    // Update progress bars
    const activeCount = stats.active;

    this.updateProgressBar('stage1', stats.stage1Complete, activeCount);
    this.updateProgressBar('stage2', stats.stage2Complete, stats.stage1Complete);
    this.updateProgressBar('stage3', stats.stage3Complete, stats.stage2Complete);
    this.updateProgressBar('stage4', stats.stage4Complete, stats.stage3Complete);
    this.updateProgressBar('stage5', stats.stage5Complete, stats.stage4Complete);

    // Update workflow badge counts
    const properties = await db.getProperties(auction.id);
    document.getElementById('stage1Count').textContent = properties.filter(p => !p.stage_1_complete && !p.is_excluded).length;
    document.getElementById('stage2Count').textContent = properties.filter(p => p.stage_1_complete && !p.stage_2_complete && !p.is_excluded).length;
    document.getElementById('stage3Count').textContent = properties.filter(p => p.stage_2_complete && !p.stage_3_complete && !p.is_excluded).length;
    document.getElementById('stage4Count').textContent = properties.filter(p => p.stage_3_complete && !p.stage_4_complete && !p.is_excluded).length;
    document.getElementById('stage5Count').textContent = properties.filter(p => p.stage_4_complete && !p.stage_5_complete && !p.is_excluded).length;
  },

  // Update progress bar
  updateProgressBar(stage, completed, total) {
    const percent = total > 0 ? (completed / total) * 100 : 0;
    document.getElementById(`${stage}Progress`).style.width = percent + '%';
    document.getElementById(`${stage}Text`).textContent = `${completed} / ${total}`;
  },

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast-' + type;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  // Close modal
  closeModal() {
    document.getElementById('propertyModal').style.display = 'none';
  }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
