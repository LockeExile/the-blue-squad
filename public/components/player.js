const Player = {
  template: `<main class="mdl-layout__content">
      <div class="page-content">
        <div id="message">
          <h2>Welcome</h2>
          <h1>The Blue Squad currently in training</h1>
          <p>We're still working on setting up the site, so please check back later!</p>
          <div>{{ id }}</div>
          <div>{{ player }}</div>
        </div>
      </div>
    </main>`,
  props: ['id'],
  firebase: function () {
    const db = firebase.database();
    return {
      player: db.ref(`/players_detail/${this.id}`)
    }
  }
};