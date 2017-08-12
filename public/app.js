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
      const user = result.user;
      if (user) {
        const ref = vm.db.ref(`/players/${user.uid}`);
        ref.once('value').then(function (snapshot) {
          if (!snapshot.val()) {
            // create node for user
            ref.set({
              name: user.displayName,
              avatarSource: 'twitter',
              avatar: user.photoURL
            });
          } else if (snapshot.val().avatarSource === 'twitter') {
            // update avatar
            ref.update({ avatar: user.photoURL });
          }
        });
      }
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
        this.linkDiscord = true;
        this.db.ref(`/players/${this.auth.currentUser.uid}/merging`).set(true);
      }
      window.open('popup.html', 'name', 'height=500,width=500');
    },
    signOut: function () {
      this.working = true;
      this.auth.signOut();
    },
    mergeAccounts: function () {
      const provider = new firebase.auth.TwitterAuthProvider();
      const discordUser = this.auth.currentUser;
      const vm = this;
      const discordRef = this.db.ref(`/players/${discordUser.uid}`);
      discordRef.update({ merging: true }); // allows twitter user to update discord data
      this.auth.signInWithPopup(provider).then(function(result) {
        console.log('merging users', result);
        // update data in db
        const twitterRef = vm.db.ref(`/players/${result.user.uid}`);
        twitterRef.once('value').then(function (twitterSnapshot) {
          const twitterData = twitterSnapshot.val();
          if (twitterData.merging) { // move twitter data to discord account
            twitterData.merging = null; // remove merging flag from discord ref
            discordRef.update(twitterData);

            // update user profile
            discordUser.updateProfile({
              displayName: result.user.displayName,
              photoURL: result.user.photoURL
            });
          } // else keep discord data
          twitterRef.remove();
        });

        // merge auth accounts
        return result.user.delete().then(function() {
          return discordUser.linkWithCredential(result.credential);
        }).then(function() {
          return vm.auth.signInWithRedirect(provider);
        });
      });
    }
  }
});

new Vue({
  el: '#app'
});