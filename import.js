// Import Data functionality
const importData = {
  roddyData: {},

  // Parse CSV file
  parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
      });
      rows.push(row);
    }

    return rows;
  },

  // Parse a single CSV line (handles quoted values)
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  },

  // Normalize address for matching
  normalizeAddress(address) {
    if (!address) return '';
    return address
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\./g, '')
      .replace(/,/g, '')
      .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct)\b/g, '')
      .trim();
  },

  // Load Roddy files
  async loadRoddyFiles() {
    try {
      const counties = ['CO', 'DA', 'DN', 'EL', 'TA'];
      let totalLoaded = 0;

      for (const county of counties) {
        const fileInput = document.getElementById(`roddy${county}`);
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const text = await file.text();
          const rows = this.parseCSV(text);

          rows.forEach(row => {
            const address = this.normalizeAddress(row.Address || row.address);
            if (address) {
              this.roddyData[address] = {
                roddy_id: `${county}-${row.ID || Math.random().toString(36).substring(7)}`,
                address: row.Address || row.address,
                city: row.City || row.city,
                county: county,
                pool_roddy: row.Pool || row.pool || '',
                year_built: parseInt(row['Year Built'] || row.year_built || 0),
                assessed_value: parseFloat(row['Assessed Value'] || row.assessed_value || 0)
              };
              totalLoaded++;
            }
          });
        }
      }

      const statusDiv = document.getElementById('roddyStatus');
      if (totalLoaded > 0) {
        statusDiv.innerHTML = `<div class="success">✓ Loaded ${totalLoaded} properties from Roddy files</div>`;
        document.getElementById('auctionImportSection').style.display = 'block';
      } else {
        statusDiv.innerHTML = '<div class="error">No Roddy files loaded. Please select at least one file.</div>';
      }
    } catch (err) {
      console.error('Error loading Roddy files:', err);
      document.getElementById('roddyStatus').innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
  },

  // Process auction.com files
  async processAuctionFiles() {
    try {
      const auctionMonth = document.getElementById('auctionMonth').value.trim();
      const auctionDate = document.getElementById('auctionDate').value;
      const fileInput = document.getElementById('auctionFiles');

      if (!auctionMonth) {
        app.showToast('Please enter auction month', 'error');
        return;
      }

      if (fileInput.files.length === 0) {
        app.showToast('Please select auction files', 'error');
        return;
      }

      document.getElementById('auctionStatus').innerHTML = '<div class="info">Processing files...</div>';

      // Create auction record
      const auction = await db.createAuction({
        auction_month: auctionMonth,
        auction_date: auctionDate || null,
        status: 'active'
      });

      // Process all auction files
      const allProperties = [];
      for (const file of fileInput.files) {
        const text = await file.text();
        const rows = this.parseCSV(text);

        rows.forEach(row => {
          const property = this.buildPropertyObject(row, auction.id);
          if (property) {
            allProperties.push(property);
          }
        });
      }

      // Save to database
      await db.createProperties(allProperties);

      // Update auction counts
      const excluded = allProperties.filter(p => p.is_excluded).length;
      await db.updateAuction(auction.id, {
        properties_imported: allProperties.length,
        properties_excluded: excluded,
        properties_analyzed: allProperties.length - excluded
      });

      // Show summary
      this.showImportSummary(allProperties);

      app.showToast('Import completed successfully!', 'success');

      // Refresh dashboard
      setTimeout(() => {
        app.showScreen('dashboard');
      }, 2000);

    } catch (err) {
      console.error('Error processing auction files:', err);
      document.getElementById('auctionStatus').innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
  },

  // Build property object from CSV row
  buildPropertyObject(row, auctionId) {
    const address = row['Property Address'] || row.address || row.Address;
    if (!address) return null;

    const normalizedAddress = this.normalizeAddress(address);
    const roddyMatch = this.roddyData[normalizedAddress];

    const property = {
      auction_id: auctionId,
      address: address,
      city: row.City || row.city || (roddyMatch ? roddyMatch.city : null),
      county: roddyMatch ? roddyMatch.county : null,
      state: row.State || row.state || 'TX',
      zip: row.ZIP || row.zip || row['Zip Code'] || null,
      property_type: row['Property Type'] || row.property_type || 'Single Family',
      bedrooms: parseInt(row.Bedrooms || row.bedrooms || 0) || null,
      bathrooms: parseFloat(row.Bathrooms || row.bathrooms || 0) || null,
      sqft: parseInt(row['Square Footage'] || row.sqft || row['Living Area'] || 0) || null,
      year_built: parseInt(row['Year Built'] || row.year_built || 0) || (roddyMatch ? roddyMatch.year_built : null),
      assessed_value: parseFloat(row['Assessed Value'] || row.assessed_value || 0) || (roddyMatch ? roddyMatch.assessed_value : null),
      starting_bid: parseFloat(row['Starting Bid'] || row.starting_bid || 0) || null,
      auction_com_id: row['Auction.com ID'] || row.auction_com_id || null,
      on_auction_site: row.Status === 'Active' ? 'YES' : 'NO'
    };

    // Add Roddy data if matched
    if (roddyMatch) {
      property.roddy_id = roddyMatch.roddy_id;
      property.pool_roddy = roddyMatch.pool_roddy;
    }

    // Calculate auto score
    property.auto_score = calculateAutoScore(property);

    // Set city tier
    property.city_tier = getCityTier(property.city);

    // Check exclusions
    const propertyWithExclusions = checkExclusions(property);

    return propertyWithExclusions;
  },

  // Show import summary
  showImportSummary(properties) {
    const summaryDiv = document.getElementById('importSummary');
    const total = properties.length;
    const excluded = properties.filter(p => p.is_excluded).length;
    const active = total - excluded;

    // Get exclusion breakdown
    const exclusionReasons = {};
    properties.forEach(p => {
      if (p.exclusion_reason) {
        const reasons = p.exclusion_reason.split(', ');
        reasons.forEach(reason => {
          exclusionReasons[reason] = (exclusionReasons[reason] || 0) + 1;
        });
      }
    });

    let html = `
      <h3>Import Summary</h3>
      <div class="summary-stats">
        <div class="summary-stat">
          <span class="stat-label">Total Imported:</span>
          <span class="stat-value">${total}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Active Properties:</span>
          <span class="stat-value">${active}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Auto-Excluded:</span>
          <span class="stat-value">${excluded}</span>
        </div>
      </div>
    `;

    if (Object.keys(exclusionReasons).length > 0) {
      html += '<h4>Exclusion Breakdown:</h4><ul class="exclusion-list">';
      Object.entries(exclusionReasons)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
          html += `<li>${reason}: <strong>${count}</strong></li>`;
        });
      html += '</ul>';
    }

    summaryDiv.innerHTML = html;
    summaryDiv.style.display = 'block';
  }
};
