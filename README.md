# AJ Auction Management System

A comprehensive web application for managing real estate auction analysis, team workflow, and bidding strategy.

## Features

- **Password Protected Access**: Secure login with password protection
- **Multi-Stage Workflow**: 5-stage process for property evaluation (Jessica → Kalen → Christian → JR → Post-Auction)
- **Automated Scoring**: Auto-scoring algorithm based on property characteristics
- **Smart Exclusions**: Automatic property exclusion based on business rules
- **Data Import**: CSV import from Roddy and Auction.com
- **Analytics Dashboard**: Real-time insights and progress tracking
- **Property Review**: Comprehensive filtering and property details
- **Bid Calculation**: Automated max bid calculation with manual adjustments

## Setup Instructions

### 1. Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com) and sign in
2. Navigate to the SQL Editor
3. Run the `schema.sql` file to create the database tables
4. Verify that both `auctions` and `auction_properties` tables are created

### 2. Deploy to Netlify

#### Option A: Drag & Drop (Easiest)

1. Go to [Netlify](https://www.netlify.com)
2. Sign in or create an account
3. Click "Add new site" → "Deploy manually"
4. Drag and drop all project files into the deploy zone
5. Wait for deployment to complete
6. Your site will be live at a Netlify URL (e.g., `yoursite.netlify.app`)

#### Option B: Git Repository

1. Push code to a GitHub repository
2. Go to [Netlify](https://www.netlify.com)
3. Click "Add new site" → "Import from Git"
4. Connect your GitHub repository
5. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: (leave empty, or use root `/`)
6. Click "Deploy site"

### 3. Access the Application

1. Navigate to your deployed Netlify URL
2. Enter password: `ajauction2025`
3. You're now in the application!

## User Guide

### Import Process

#### Step 1: Upload Roddy Files

1. Navigate to **Import Data** screen
2. Upload CSV files for each county (CO, DA, DN, EL, TA)
3. Expected columns: Address, City, County, Pool, Year Built, Assessed Value
4. Click "Load Roddy Data"
5. Wait for confirmation message

#### Step 2: Upload Auction.com Files

1. Enter the auction month (e.g., "December 2025")
2. Select auction date (optional)
3. Upload one or more CSV files from Auction.com
4. Expected columns: Property Address, City, Status, Bedrooms, Bathrooms, Square Footage
5. Click "Import & Process"
6. Review the import summary showing:
   - Total properties imported
   - Auto-excluded properties
   - Exclusion breakdown by reason

### Team Workflow

#### Stage 1: Jessica (Initial Review)

**Tasks:**
- Verify property is on auction site (YES/NO/REMOVED)
- Check for pool via satellite imagery (Y/N/?)
- Enter Realtor value
- Enter last sold date and price
- Add notes

**Navigation:**
- Click "Complete & Next" to advance to next property
- Properties auto-advance after completion

#### Stage 2: Kalen (Pool & Solar Check)

**Tasks:**
- Final pool verification across all sources
- Check for solar panels
- Mark pool status from Realtor.com
- Exclude properties with pool or solar (with confirmation)

**Note:** Can only see properties that completed Stage 1

#### Stage 3: Christian (Manual Scoring)

**Tasks:**
- Rate photo condition (Excellent/Good/Fair/Poor)
- Assign manual score (1-10 slider)
- Enter renovation notes

**Note:** Only shows non-excluded properties from Stage 2

#### Stage 4: JR (Final Approval)

**Tasks:**
- Assign JR Grade (1-10)
- Set title status (Clean/Minor Issues/Major Issues)
- Enter title notes
- Set priority level (1=Never Drop, 2=Protect, 3=Normal, 4=Drop First)
- Review auto-calculated max bid
- Apply "feel adjustment" if needed
- Final max bid is calculated

**Note:** Only shows properties from Stage 3

#### Stage 5: Post-Auction (Results Entry)

**Tasks:**
- Enter opening bid (actual)
- Enter our bid placed
- Enter winning bid
- Select outcome (WON/LOST/NO_BID/OUT_OF_FUNDS/CANCELED)
- Equity % is auto-calculated

### Review Properties

**Features:**
- Sortable table of all properties
- Filters:
  - Status (All/Active/Excluded)
  - Stage (Any/1/2/3/4/Complete)
  - City dropdown
  - Score range (min-max)
- Click any property to view full details in modal
- Export filtered results to CSV

### Dashboard

**Displays:**
- Active auction month
- Total properties / Excluded / Ready to Bid
- Budget remaining
- Days until auction
- Progress bars for each stage
- Stage counts for team members

### Analytics

**Charts:**
- Properties by stage (bar chart)
- Exclusion breakdown (pie chart)
- Score distribution (histogram)
- Properties by city (table)

## Scoring & Exclusion Rules

### Auto-Scoring Formula

**Base Score:** 4.5

**Age Scoring (50% weight):**
- ≤5 years: +2.0
- 6-14 years: +1.5
- 15-24 years: +0.5
- 25-30 years: 0
- >30 years: -0.5

**Size Scoring (15% weight):**
- ≤2,300 sqft: +1.5
- 2,301-2,600 sqft: +1.0
- 2,601-3,000 sqft: +0.5

**Property Type (10% weight):**
- Single Family: +0.9
- Townhouse/Townhome: +0.3

**City Tier (10% weight):**
- Tier 1: +0.5
- Tier 2: +0.2
- Tier 3: 0
- Penalty: -0.3

**Last Sold Bonus (15% weight):**
- Sold 2020-2024: +0.5
- Sold 2015-2019: +0.3
- Sold 2010-2014: +0.1

**COVID Bonuses:**
- Built ≥2020: +0.3
- Sold 2020-2022: +0.2

**Roddy Data Bonus:** +0.7

**Max Score:** 10.0

### Auto-Exclusion Rules

Properties are automatically excluded if:
- Has pool (any source: Roddy, Satellite, or Realtor)
- Has solar panels
- Over 3,000 sqft
- Over $500k realtor value
- City is in exclusion list (Heartland, Watauga, Ennis, Justin, Cleburne, Commerce, Ector, Kaufman, Quinlan)
- Property type is not Single Family/Townhouse/Townhome

### City Tier Classifications

**Tier 1 (+0.5):** McKinney, Plano, Frisco, Allen, Prosper, Celina, Princeton, Little Elm, Aubrey, Wylie, Murphy, Parker, Lucas, Fairview, Lowry Crossing, Melissa, Garland, Mesquite, Carrollton, Lewisville

**Tier 2 (+0.2):** Fort Worth, Dallas, Arlington, Grand Prairie, Rockwall, Irving, Denison, Flower Mound, Rowlett, Bedford, Oak Point, Sherman

**Tier 3 (0):** Forney, Desoto, Midlothian, Cedar Hill, Waxahachie, Royse City, Mansfield, Crowley, Lancaster, Glenn Heights, Seagoville, Josephine, Sanger

**Penalty (-0.3):** Terrell

**Auto-Exclude:** Heartland, Watauga, Ennis, Justin, Cleburne, Commerce, Ector, Kaufman, Quinlan

### Bid Calculation Formula

**Base Percentage:** 70%

**JR Grade Adjustments:**
- Grade 10: 78%
- Grade 9: 76%
- Grade 8: 74%
- Grade 7: 72%
- Grade 6: 70%
- Grade <6: 68%

**Year Built Adjustments:**
- ≥2020: +3%
- 2015-2019: +2%
- 2010-2014: 0%
- <2010: -2%

**City Tier Adjustments:**
- Tier 1: +1%
- Tier 3: -1%

**Final Calculation:**
```
Max Bid (Formula) = Realtor Value × (Adjusted Percentage)
Final Max Bid = Max Bid (Formula) + Feel Adjustment
```

## Troubleshooting

### Cannot Login
- Verify password is exactly: `ajauction2025`
- Check browser console for errors
- Clear browser cache and try again

### Import Fails
- Verify CSV file format matches expected columns
- Check for special characters in addresses
- Ensure file is not corrupted

### Properties Not Showing in Stage
- Verify previous stage is completed
- Check if property is excluded
- Refresh the page

### Charts Not Loading
- Ensure active auction exists
- Check browser console for errors
- Verify Supabase connection

## Support & Contact

For issues or questions, contact the development team or create an issue in the repository.

## Future Enhancements (Phase 1B & 2)

- Google Drive integration for automatic file imports
- Live auction tracking dashboard
- Historical analytics across multiple auctions
- Email notifications for stage completions
- Mobile app version
- Bulk property editing
- Custom report generation

## License

© 2025 AJ Auction Management. All rights reserved.
