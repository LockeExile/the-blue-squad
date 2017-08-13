Vue.component('tbs-player-card', {
  template: `<div class="tbs-card mdl-card mdl-shadow--2dp">
      <div class="mdl-card__title mdl-card--expand">
        <img class="tbs-avatar" :src="player.avatar" />
        <h2 class="mdl-card__title-text">{{ player.name }}</h2>
      </div>
      <div class="mdl-card__supporting-text">{{ player.bio }}</div>
      <div class="mdl-card__actions mdl-card--border">
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">Action</a>
      </div>
    </div>`,
  props: ['player', 'index'],
});