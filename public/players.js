Chart.defaults.global.legend.display = false;

Vue.use(VueCharts);

Vue.component('tbs-player-card', {
  template: `<div class="tbs-card mdl-card mdl-shadow--2dp">
  <img class="tbs-avatar" :src="player.avatar" />
      <div class="mdl-card__title mdl-card--expand">
        <h2 class="mdl-card__title-text">{{ player.name }}</h2>
        <span class="mdl-card__subtitle-text" v-if="player.team">{{ player.team }}</span>
      </div>
      <table class="tbs-ranks" v-if="typeof player.rank !== 'undefined'">
        <tr><th>SZ:</th><td>{{ player.rank.zones }}<small v-if="typeof player.rank.zones_number !== 'undefined'">{{ player.rank.zones_number }}</small></td></tr>
        <tr><th>TC:</th><td>{{ player.rank.zones }}<small v-if="typeof player.rank.tower_number !== 'undefined'">{{ player.rank.tower_number }}</small></td></tr>
        <tr><th>RM:</th><td>{{ player.rank.zones }}<small v-if="typeof player.rank.rainmaker_number !== 'undefined'">{{ player.rank.rainmaker_number }}</small></td></tr>
      </table>
      <div class="tbs-roles"><chartjs-radar :width="120" :height="120" :option="rolesOptions" :labels="rolesLabels" :data="roles"></chartjs-radar></div>
      <div class="mdl-card__actions mdl-card--border">
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">Summary</a>
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">Weapons</a>
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">Bio</a>
      </div>
    </div>`,
  props: ['player', 'index'],
  data: function() {
    return {
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
        this.player.roles.slayer] : []
    };
  },
  firebase: function () {
    const db = firebase.database();
    return {
      records: db.ref(`/players_detail/${this.player['.key']}/records`)
    }
  },
});