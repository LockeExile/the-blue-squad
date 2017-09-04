Chart.defaults.global.legend.display = false;

Vue.use(VueCharts);

Vue.component('tbs-player-card', {
  template: `<div class="tbs-card mdl-card mdl-shadow--2dp">
      <img class="tbs-avatar" :src="player.avatar" />
      <div class="mdl-card__title mdl-card--expand">
        <h2 class="mdl-card__title-text">{{ player.name }}</h2>
        <span class="mdl-card__subtitle-text" v-if="player.team">{{ player.team }}</span>
      </div>
      <div v-if="tab === 'summary'">
        <table class="tbs-ranks" v-if="typeof player.rank !== 'undefined'">
          <tr><th>SZ:</th><td>{{ player.rank.zones }}<small v-if="typeof player.rank.zones_number !== 'undefined'">{{ player.rank.zones_number }}</small></td></tr>
          <tr><th>TC:</th><td>{{ player.rank.zones }}<small v-if="typeof player.rank.tower_number !== 'undefined'">{{ player.rank.tower_number }}</small></td></tr>
          <tr><th>RM:</th><td>{{ player.rank.zones }}<small v-if="typeof player.rank.rainmaker_number !== 'undefined'">{{ player.rank.rainmaker_number }}</small></td></tr>
        </table>
        <div class="tbs-roles"><chartjs-radar :width="120" :height="120" :option="rolesOptions" :labels="rolesLabels" :data="roles"></chartjs-radar></div>
      </div>
      <div v-if="tab === 'weapons'">
        <chartjs-horizontal-bar :width="300" :height="120" :labels="weaponsLabels" :option="weaponsOptions" :datasets="weaponsData"></chartjs-horizontal-bar>
      </div>
      <div class="mdl-card__supporting-text" v-if="tab === 'bio'">{{ player.bio }}</div>
      <div class="mdl-card__actions mdl-card--border">
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" @click="tab = 'summary'">Summary</a>
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" @click="tab = 'weapons'">Weapons</a>
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" @click="tab = 'bio'">Bio</a>
      </div>
    </div>`,
  props: ['player', 'index'],
  data: function() {
    return {
      tab: 'summary',
      rolesOptions: {
        scale: {
          ticks: { display: false },
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem) {
              return null;
            }
          }
        }
      },
      rolesLabels: ['Point', 'Turf', 'Zone', 'Support', 'Anchor', 'Slay'],
      roles: this.player.roles ? [
        this.player.roles.point,
        this.player.roles.turf,
        this.player.roles.zoner,
        this.player.roles.support,
        this.player.roles.anchor,
        this.player.roles.slayer] : [],
      weaponsOptions: {
        scales: {
          xAxes: [{ display: false, stacked: false }],
          yAxes: [{ gridLines: { display: false }}] // TODO just display: false the whole thing if adding icons
        }
      }
    };
  },
  computed: {
    weapons: function() {
      const self = this;
      console.log(this.records);
      return this.records.weapon_stats ? Object.keys(this.records.weapon_stats).sort(function(a, b) {
        a = self.records.weapon_stats[a];
        b = self.records.weapon_stats[b];
        return (b.win_count + b.lose_count) - (a.win_count + a.lose_count);
      }).slice(0, 4).map(function(key) {
        return self.records.weapon_stats[key];
      }) : [];
    },
    weaponsLabels: function() {
      return this.weapons.map(function(wep) {
        return wep.weapon.id; // TODO weapon short name, or disable labels and add icons manually
      });
    },
    weaponsData: function() {
      return [{
        data: this.weapons.map(function(wep) {
          return wep.win_count;
        }),
        backgroundColor: this.weapons.map(function(wep) {
          const wr = wep.win_count / (wep.win_count + wep.lose_count);
          return (
            wr > 0.5 ? chroma('blue').darken(10 * wr - 5) :
            wr < 0.5 ? chroma('blue').brighten(5 - 10 * wr) :
            chroma('blue')).hex();
        })
      }, {
        data: this.weapons.map(function(wep) {
          return wep.lose_count;
        }),
        backgroundColor: this.weapons.map(function(wep) {
          const lr = wep.lose_count / (wep.win_count + wep.lose_count);
          return (
            lr > 0.5 ? chroma('orange').darken(10 * lr - 5) :
            lr < 0.5 ? chroma('orange').brighten(5 - 10 * lr) :
            chroma('orange')).hex();
        })
      }]
    }
  },
  firebase: function () {
    const db = firebase.database();
    return {
      records: {
        source: db.ref(`/players_detail/${this.player['.key']}/records`),
        asObject: true
      }
    }
  },
});