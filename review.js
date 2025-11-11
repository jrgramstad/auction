// Review Properties functionality
const review = {
  allProperties: [],
  filteredProperties: [],
  sortField: 'auto_score',
  sortAscending: false,

  // Initialize review screen
  async init() {
    const currentAuctionId = await loadCurrentAuction();
    if (!currentAuctionId) {
      document.getElementById('propertiesTableBody').innerHTML = '<tr><td colspan="8">No active auction</td></tr>';
      return;
    }

    this.allProperties = await db.getProperties(currentAuctionId);
    this.populateCityFilter();
    this.applyFilters();
  },

  // Populate city dropdown
  populateCityFilter() {
    const cities = [...new Set(this.allProperties.map(p => p.city).filter(Boolean))];
    cities.sort();

    const select = document.getElementById('filterCity');
    select.innerHTML = '<option value="all">All Cities</option>';

    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    });
  },

  // Apply filters
  applyFilters() {
    const status = document.getElementById('filterStatus').value;
    const stage = document.getElementById('filterStage').value;
    const city = document.getElementById('filterCity').value;
    const scoreMin = parseFloat(document.getElementById('filterScoreMin').value);
    const scoreMax = parseFloat(document.getElementById('filterScoreMax').value);

    this.filteredProperties = this.allProperties.filter(property => {
      // Status filter
      if (status === 'active' && property.is_excluded) return false;
      if (status === 'excluded' && !property.is_excluded) return false;

      // Stage filter
      if (stage !== 'any') {
        if (stage === '1' && property.stage_1_complete) return false;
        if (stage === '2' && (!property.stage_1_complete || property.stage_2_complete)) return false;
        if (stage === '3' && (!property.stage_2_complete || property.stage_3_complete)) return false;
        if (stage === '4' && (!property.stage_3_complete || property.stage_4_complete)) return false;
        if (stage === 'complete' && !property.stage_4_complete) return false;
      }

      // City filter
      if (city !== 'all' && property.city !== city) return false;

      // Score filter
      if (!isNaN(scoreMin) && property.auto_score < scoreMin) return false;
      if (!isNaN(scoreMax) && property.auto_score > scoreMax) return false;

      return true;
    });

    this.renderTable();
  },

  // Sort by field
  sortBy(field) {
    if (this.sortField === field) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortField = field;
      this.sortAscending = false;
    }

    this.filteredProperties.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (this.sortAscending) {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    this.renderTable();
  },

  // Render table
  renderTable() {
    const tbody = document.getElementById('propertiesTableBody');

    if (this.filteredProperties.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No properties match the filters</td></tr>';
      return;
    }

    tbody.innerHTML = this.filteredProperties.map(property => {
      const stageStatus = this.getStageStatus(property);
      const excludedBadge = property.is_excluded ? '<span class="badge badge-danger">Yes</span>' : '<span class="badge badge-success">No</span>';

      return `
        <tr>
          <td>${property.address}</td>
          <td>${property.city || 'N/A'}</td>
          <td>${property.auto_score || 'N/A'}</td>
          <td>${property.jr_grade || '-'}</td>
          <td>${stageStatus}</td>
          <td>${excludedBadge}</td>
          <td>${property.final_max_bid ? '$' + property.final_max_bid.toLocaleString() : '-'}</td>
          <td>
            <button class="btn btn-sm" onclick="review.viewProperty(${property.id})">View</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // Get stage status text
  getStageStatus(property) {
    if (property.stage_5_complete) return '<span class="badge badge-purple">Stage 5</span>';
    if (property.stage_4_complete) return '<span class="badge badge-blue">Stage 4</span>';
    if (property.stage_3_complete) return '<span class="badge badge-green">Stage 3</span>';
    if (property.stage_2_complete) return '<span class="badge badge-yellow">Stage 2</span>';
    if (property.stage_1_complete) return '<span class="badge badge-orange">Stage 1</span>';
    return '<span class="badge badge-gray">Pending</span>';
  },

  // View property details
  async viewProperty(propertyId) {
    const property = await db.getProperty(propertyId);
    if (!property) return;

    const modal = document.getElementById('propertyModal');
    const details = document.getElementById('propertyDetails');

    details.innerHTML = `
      <h2>${property.address}</h2>
      <p class="property-subtitle">${property.city}, ${property.county} County, ${property.state} ${property.zip || ''}</p>

      ${property.is_excluded ? `<div class="alert alert-danger"><strong>EXCLUDED:</strong> ${property.exclusion_reason}</div>` : ''}

      <div class="property-detail-grid">
        <div class="detail-section">
          <h3>Property Info</h3>
          <p><strong>Type:</strong> ${property.property_type || 'N/A'}</p>
          <p><strong>Year Built:</strong> ${property.year_built || 'N/A'}</p>
          <p><strong>Size:</strong> ${property.sqft ? property.sqft.toLocaleString() + ' sqft' : 'N/A'}</p>
          <p><strong>Bedrooms:</strong> ${property.bedrooms || 'N/A'}</p>
          <p><strong>Bathrooms:</strong> ${property.bathrooms || 'N/A'}</p>
          <p><strong>Lot Size:</strong> ${property.lot_size || 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h3>Financial</h3>
          <p><strong>Assessed Value:</strong> ${property.assessed_value ? '$' + property.assessed_value.toLocaleString() : 'N/A'}</p>
          <p><strong>Realtor Value:</strong> ${property.realtor_value ? '$' + property.realtor_value.toLocaleString() : 'N/A'}</p>
          <p><strong>Starting Bid:</strong> ${property.starting_bid ? '$' + property.starting_bid.toLocaleString() : 'N/A'}</p>
          <p><strong>Last Sold:</strong> ${property.last_sold_date || 'N/A'} ${property.last_sold_price ? '($' + property.last_sold_price.toLocaleString() + ')' : ''}</p>
          <p><strong>Final Max Bid:</strong> ${property.final_max_bid ? '$' + property.final_max_bid.toLocaleString() : 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h3>Scoring</h3>
          <p><strong>Auto Score:</strong> ${property.auto_score || 'N/A'}</p>
          <p><strong>Manual Score:</strong> ${property.manual_score || 'N/A'}</p>
          <p><strong>JR Grade:</strong> ${property.jr_grade || 'N/A'}</p>
          <p><strong>City Tier:</strong> ${property.city_tier || 'N/A'}</p>
          <p><strong>Priority:</strong> ${property.priority_level || 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h3>Checks</h3>
          <p><strong>Pool (Roddy):</strong> ${property.pool_roddy || 'N/A'}</p>
          <p><strong>Pool (Satellite):</strong> ${property.pool_satellite || 'N/A'}</p>
          <p><strong>Pool (Realtor):</strong> ${property.pool_realtor || 'N/A'}</p>
          <p><strong>Has Solar:</strong> ${property.has_solar ? 'Yes' : 'No'}</p>
          <p><strong>On Auction Site:</strong> ${property.on_auction_site || 'N/A'}</p>
        </div>

        ${property.stage_3_complete ? `
          <div class="detail-section">
            <h3>Christian's Review</h3>
            <p><strong>Photo Condition:</strong> ${property.photo_condition || 'N/A'}</p>
            <p><strong>Renovation Notes:</strong></p>
            <p>${property.renovation_notes || 'None'}</p>
          </div>
        ` : ''}

        ${property.stage_4_complete ? `
          <div class="detail-section">
            <h3>JR's Review</h3>
            <p><strong>Title Status:</strong> ${property.title_status || 'N/A'}</p>
            <p><strong>Title Notes:</strong></p>
            <p>${property.title_issues || 'None'}</p>
            <p><strong>Feel Adjustment:</strong> ${property.feel_adjustment ? '$' + property.feel_adjustment.toLocaleString() : '$0'}</p>
          </div>
        ` : ''}

        ${property.stage_5_complete ? `
          <div class="detail-section">
            <h3>Auction Results</h3>
            <p><strong>Opening Bid:</strong> ${property.opening_bid_actual ? '$' + property.opening_bid_actual.toLocaleString() : 'N/A'}</p>
            <p><strong>Our Bid:</strong> ${property.our_bid_placed ? '$' + property.our_bid_placed.toLocaleString() : 'N/A'}</p>
            <p><strong>Winning Bid:</strong> ${property.winning_bid ? '$' + property.winning_bid.toLocaleString() : 'N/A'}</p>
            <p><strong>Outcome:</strong> <span class="badge">${property.outcome || 'N/A'}</span></p>
            <p><strong>Equity %:</strong> ${property.equity_percent ? property.equity_percent + '%' : 'N/A'}</p>
          </div>
        ` : ''}
      </div>

      <div class="detail-section">
        <h3>Notes</h3>
        ${property.stage_1_notes ? `<p><strong>Stage 1:</strong> ${property.stage_1_notes}</p>` : ''}
        ${property.stage_2_notes ? `<p><strong>Stage 2:</strong> ${property.stage_2_notes}</p>` : ''}
      </div>
    `;

    modal.style.display = 'block';
  },

  // Export to CSV
  exportCSV() {
    const headers = [
      'Address', 'City', 'County', 'State', 'ZIP',
      'Property Type', 'Year Built', 'Sqft', 'Bedrooms', 'Bathrooms',
      'Auto Score', 'Manual Score', 'JR Grade', 'City Tier',
      'Assessed Value', 'Realtor Value', 'Starting Bid', 'Final Max Bid',
      'Is Excluded', 'Exclusion Reason',
      'Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5',
      'Photo Condition', 'Title Status', 'Priority',
      'Outcome', 'Winning Bid', 'Equity %'
    ];

    const rows = this.filteredProperties.map(p => [
      p.address,
      p.city,
      p.county,
      p.state,
      p.zip,
      p.property_type,
      p.year_built,
      p.sqft,
      p.bedrooms,
      p.bathrooms,
      p.auto_score,
      p.manual_score,
      p.jr_grade,
      p.city_tier,
      p.assessed_value,
      p.realtor_value,
      p.starting_bid,
      p.final_max_bid,
      p.is_excluded ? 'Yes' : 'No',
      p.exclusion_reason || '',
      p.stage_1_complete ? 'Yes' : 'No',
      p.stage_2_complete ? 'Yes' : 'No',
      p.stage_3_complete ? 'Yes' : 'No',
      p.stage_4_complete ? 'Yes' : 'No',
      p.stage_5_complete ? 'Yes' : 'No',
      p.photo_condition,
      p.title_status,
      p.priority_level,
      p.outcome,
      p.winning_bid,
      p.equity_percent
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auction-properties-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    app.showToast('CSV exported successfully!', 'success');
  }
};
