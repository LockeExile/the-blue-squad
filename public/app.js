Vue.component('tbs-header', {
  template: `<header class="mdl-layout__header mdl-layout__header--waterfall">
      <div class="mdl-layout__header-row">
        <span class="mdl-layout-title">The Blue Squad</span>
        <div class="mdl-layout-spacer"></div>
        <img id="user-icon" v-if="user" :src="user.photoURL" />
        <span id="user-name">{{ user ? user.displayName : 'Guest' }}</span>
        <button id="user-menu" class="mdl-button mdl-js-button mdl-button--icon" :disabled="working">
          <i class="material-icons">more_vert</i>
        </button>
        <ul class="mdl-menu mdl-menu--bottom-right mdl-js-menu mdl-js-ripple-effect" for="user-menu">
          <li class="mdl-menu__item" v-if="!usesTwitter" @click="signInTwitter">{{ user ? "Link with Twitter" : "Sign in with Twitter" }}</li>
          <li class="mdl-menu__item" v-if="!usesDiscord" @click="signInDiscord">{{ user ? "Link with Discord" : "Sign in with Discord" }}</li>
          <li class="mdl-menu__item" v-if="user" @click="signOut">Sign out</li>
        </ul>
      </div>
    </header>`,
  data: function () {
    // initialize auth callbacks
    const vm = this,
          auth = firebase.auth(),
          db = firebase.database();

    auth.getRedirectResult().then(function(result) {
        // const user = result.user;
        // console.log('twitter user', user);
      }, function(error) {
        if (error.code === 'auth/credential-already-in-use') {
          vm.mergeAccounts();
        }
      });

    auth.onAuthStateChanged(function(user) {
      console.log('user', user);
      vm.user = user;
      vm.usesTwitter = user && user.providerData.length > 0; // hack - twitter is currently the only supported 'provider'
      vm.usesDiscord = user && user.uid.includes('discord:'); // hack - all discord-linked accounts have a uid starting with discord:

      if (vm.linkDiscord) {
        vm.linkDiscord = false;
        vm.signInTwitter();
      } else {
        vm.working = false;
      }
    });

    return {
      auth: auth,
      db: db,
      working: true,
      linkDiscord: false,
      user: null,
      usesTwitter: false,
      usesDiscord: false
    };
  },
  methods: {
    signInTwitter: function () {
      this.working = true;
      const provider = new firebase.auth.TwitterAuthProvider();
      if (this.auth.currentUser) { // link
        this.auth.currentUser.linkWithRedirect(provider);
      } else { // sign in
        this.auth.signInWithRedirect(provider);
      }
    },
    signInDiscord: function () {
      this.working = true;
      if (this.auth.currentUser) {
        // set flag - we're going to sign into discord first, then trigger a link with twitter
        linkDiscord = true;
      }
      window.open('popup.html', 'name', 'height=500,width=500');
    },
    signOut: function () {
      this.working = true;
      this.auth.signOut();
    },
    mergeAccounts: function () {
      const provider = new firebase.auth.TwitterAuthProvider();
      const prevUser = this.auth.currentUser;
      this.auth.signInWithPopup(provider).then(function(result) {
        console.log('merging users', result);
        // TODO merge user to prevUser - save avatar, etc.
        return result.user.delete().then(function() {
          return prevUser.linkWithCredential(result.credential);
        }).then(function() {
          return this.auth.signInWithRedirect(provider);
        });
      });
    }
  }
});

new Vue({
  el: '#app'
});