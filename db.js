// Initialize Supabase client
const supabase = window.supabase.createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Database helper functions
const db = {
  // Auction functions
  async getActiveAuction() {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (err) {
      console.error('Error fetching active auction:', err);
      return null;
    }
  },

  async createAuction(auctionData) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .insert([auctionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating auction:', err);
      throw err;
    }
  },

  async updateAuction(id, updates) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating auction:', err);
      throw err;
    }
  },

  // Property functions
  async getProperties(auctionId = null, filters = {}) {
    try {
      let query = supabase.from('auction_properties').select('*');

      if (auctionId) {
        query = query.eq('auction_id', auctionId);
      }

      if (filters.isExcluded !== undefined) {
        query = query.eq('is_excluded', filters.isExcluded);
      }

      if (filters.stage) {
        const stageField = `stage_${filters.stage}_complete`;
        query = query.eq(stageField, filters.stage === 'pending' ? false : true);
      }

      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching properties:', err);
      return [];
    }
  },

  async getProperty(id) {
    try {
      const { data, error } = await supabase
        .from('auction_properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching property:', err);
      return null;
    }
  },

  async createProperty(propertyData) {
    try {
      const { data, error } = await supabase
        .from('auction_properties')
        .insert([propertyData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating property:', err);
      throw err;
    }
  },

  async createProperties(propertiesArray) {
    try {
      const { data, error } = await supabase
        .from('auction_properties')
        .insert(propertiesArray)
        .select();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating properties:', err);
      throw err;
    }
  },

  async updateProperty(id, updates) {
    try {
      const { data, error } = await supabase
        .from('auction_properties')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating property:', err);
      throw err;
    }
  },

  async deleteProperty(id) {
    try {
      const { error } = await supabase
        .from('auction_properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting property:', err);
      throw err;
    }
  },

  // Stage-specific queries
  async getPropertiesForStage(auctionId, stage) {
    try {
      let query = supabase
        .from('auction_properties')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('is_excluded', false);

      // Filter based on previous stage completion
      if (stage === 1) {
        query = query.eq('stage_1_complete', false);
      } else if (stage === 2) {
        query = query.eq('stage_1_complete', true).eq('stage_2_complete', false);
      } else if (stage === 3) {
        query = query.eq('stage_2_complete', true).eq('stage_3_complete', false);
      } else if (stage === 4) {
        query = query.eq('stage_3_complete', true).eq('stage_4_complete', false);
      } else if (stage === 5) {
        query = query.eq('stage_4_complete', true).eq('stage_5_complete', false);
      }

      query = query.order('auto_score', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(`Error fetching properties for stage ${stage}:`, err);
      return [];
    }
  },

  // Analytics queries
  async getAuctionStats(auctionId) {
    try {
      const { data, error } = await supabase
        .from('auction_properties')
        .select('*')
        .eq('auction_id', auctionId);

      if (error) throw error;

      const properties = data || [];

      return {
        total: properties.length,
        excluded: properties.filter(p => p.is_excluded).length,
        active: properties.filter(p => !p.is_excluded).length,
        stage1Complete: properties.filter(p => p.stage_1_complete).length,
        stage2Complete: properties.filter(p => p.stage_2_complete).length,
        stage3Complete: properties.filter(p => p.stage_3_complete).length,
        stage4Complete: properties.filter(p => p.stage_4_complete).length,
        stage5Complete: properties.filter(p => p.stage_5_complete).length,
        readyToBid: properties.filter(p => p.stage_4_complete && !p.is_excluded).length
      };
    } catch (err) {
      console.error('Error fetching auction stats:', err);
      return {
        total: 0,
        excluded: 0,
        active: 0,
        stage1Complete: 0,
        stage2Complete: 0,
        stage3Complete: 0,
        stage4Complete: 0,
        stage5Complete: 0,
        readyToBid: 0
      };
    }
  },

  async getExclusionBreakdown(auctionId) {
    try {
      const { data, error } = await supabase
        .from('auction_properties')
        .select('exclusion_reason')
        .eq('auction_id', auctionId)
        .eq('is_excluded', true);

      if (error) throw error;

      const breakdown = {};
      (data || []).forEach(prop => {
        if (prop.exclusion_reason) {
          const reasons = prop.exclusion_reason.split(', ');
          reasons.forEach(reason => {
            breakdown[reason] = (breakdown[reason] || 0) + 1;
          });
        }
      });

      return breakdown;
    } catch (err) {
      console.error('Error fetching exclusion breakdown:', err);
      return {};
    }
  },

  async getCityBreakdown(auctionId) {
    try {
      const { data, error } = await supabase
        .from('auction_properties')
        .select('city, is_excluded')
        .eq('auction_id', auctionId);

      if (error) throw error;

      const breakdown = {};
      (data || []).forEach(prop => {
        const city = prop.city || 'Unknown';
        if (!breakdown[city]) {
          breakdown[city] = { total: 0, excluded: 0, active: 0 };
        }
        breakdown[city].total++;
        if (prop.is_excluded) {
          breakdown[city].excluded++;
        } else {
          breakdown[city].active++;
        }
      });

      return breakdown;
    } catch (err) {
      console.error('Error fetching city breakdown:', err);
      return {};
    }
  }
};
