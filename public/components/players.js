const Players = {
  template: `<main class="mdl-layout__content">
      <div class="tbs-pagination">
        <button class="mdl-button mdl-js-button mdl-button--icon" :disabled="page === 1" @click="page--">
          <i class="material-icons">chevron_left</i>
        </button>
        <button class="mdl-button mdl-js-button mdl-button--icon" :disabled="pageStart + pageSize >= playersFilter.length" @click="page++">
          <i class="material-icons">chevron_right</i>
        </button>
        <div class="mdl-textfield mdl-js-textfield mdl-textfield--expandable mdl-textfield--floating-label">
          <label class="mdl-button mdl-js-button mdl-button--icon" for="filter">
            <i class="material-icons">search</i>
          </label>
          <div class="mdl-textfield__expandable-holder">
            <input id="filter" class="mdl-textfield__input" type="text" name="filter" v-model="filterString" @keyup="page = 1" />
          </div>
        </div>
      </div>
      <div style="clear: both;"></div>

      <tbs-player-card v-for="(player, index) in playersFilter" v-if="index >= pageStart && index < pageStart + 3" :key="player['.key']" :player="player" :index="index"></tbs-player-card><!--
      --><div class="tbs-card mdl-card mdl-shadow--2dp">ad after third player</div><!--
      --><tbs-player-card v-for="(player, index) in playersFilter" v-if="index >= pageStart + 3 && index < pageStart + 10" :key="player['.key']" :player="player" :index="index"></tbs-player-card><!--
      --><div class="tbs-card mdl-card mdl-shadow--2dp">ad after tenth player</div><!--
      --><tbs-player-card v-for="(player, index) in playersFilter" v-if="index >= pageStart + 10 && index < pageStart + pageSize" :key="player['.key']" :player="player" :index="index"></tbs-player-card>
    </main>`,
  firebase: function () {
    const db = firebase.database();
    const id = window.location.hash.substring(1);
    return {
      // TODO sort by date joined desc
      players: db.ref('/players'),
      player: db.ref(`/players_detail/${id}`)
    }
  },
  data: function() {
    return {
      filterString: '',
      page: 1,
      pageSize: 18
    };
  },
  computed: {
    playersFilter: function () {
      return this.filter(this.players, this.filterString, ['name']);
    },
    pageStart: function () {
      return (this.page - 1) * this.pageSize;
    }
  },
  methods: {
    filter: function (list, value, props) {
      return list.filter(function (item) {
        return props.filter(function (prop) {
          return item[prop] && item[prop].toLowerCase().indexOf(value.toLowerCase()) !== -1;
        }).length > 0;
      });
    }
  }
};

Chart.defaults.global.legend.display = false;

Vue.use(VueCharts);

Vue.component('tbs-player-card', {
  template: `<div class="tbs-card mdl-card mdl-shadow--2dp">
      <img class="tbs-avatar" :src="player.avatar" />
      <div class="mdl-card__title mdl-card--expand">
        <h2 class="mdl-card__title-text"><router-link :to="{ name: 'player', params: { id: player['.key'] }}">{{ player.name }}</router-link></h2>
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