let auth;
let linkDiscord = false;

function signInTwitter() {
  document.getElementById('user-menu').disabled = true;
  const provider = new firebase.auth.TwitterAuthProvider();
  const user = auth.currentUser;

  if (user) { // link
    user.linkWithRedirect(provider);
  } else { // sign in
    auth.signInWithRedirect(provider);
  }
}

function signInDiscord() {
  document.getElementById('user-menu').disabled = true;

  if (auth.currentUser) {
    // set flag - we're going to sign into discord first, then trigger a link with twitter
    linkDiscord = true;
  }
  window.open('popup.html', 'name', 'height=500,width=500');
}

function signOut() {
  document.getElementById('user-menu').disabled = true;
  auth.signOut();
}

function initAuth() {
  auth = firebase.auth();
  auth.getRedirectResult().then(function(result) {
    // let token = result.credential.accessToken;
    // let secret = result.credential.secret;
    // let user = result.user;
  }, function(error) {
    console.log(error);
    const provider = new firebase.auth.TwitterAuthProvider();
    if (error.code === 'auth/credential-already-in-use') {
      const prevUser = auth.currentUser;
      auth.signInWithPopup(provider).then(function(result) {
        console.log('here', result);
        // TODO merge user to prevUser - save avatar, etc.
        return result.user.delete().then(function() {
          return prevUser.linkWithCredential(result.credential);
        }).then(function() {
          return auth.signInWithRedirect(provider);
        });
      });
    }
  });

  auth.onAuthStateChanged(function(user) {
    console.log('user', user);
    if (user) { // User is signed in.
      const usesTwitter = user.providerData.length > 0; // hack - twitter is currently the only supported 'provider'
      const usesDiscord = user.uid.includes('discord:'); // hack - all discord-linked accounts have a uid starting with discord:
      console.log(`twitter: ${usesTwitter}, discord: ${usesDiscord}`);
      document.getElementById('user-icon').src = user.photoURL;
      document.getElementById('user-icon').style.display = 'inline-block';
      document.getElementById('user-name').textContent = user.displayName;
      if (usesTwitter) {
        document.getElementById('sign-in-twitter').style.display = 'none';
      } else {
        document.getElementById('sign-in-twitter').textContent = 'Link with Twitter';
        document.getElementById('sign-in-twitter').style.display = 'block';
      }
      if (usesDiscord) {
        document.getElementById('sign-in-discord').style.display = 'none';
      } else {
        document.getElementById('sign-in-discord').textContent = 'Link with Discord';
        document.getElementById('sign-in-discord').style.display = 'block';
      }
      document.getElementById('sign-out').style.display = 'block';
    } else { // User is signed out.
      document.getElementById('user-icon').style.display = 'none';
      document.getElementById('user-icon').src = '';
      document.getElementById('user-name').textContent = 'Guest';
      document.getElementById('sign-in-twitter').textContent = 'Sign in with Twitter';
      document.getElementById('sign-in-twitter').style.display = 'block';
      document.getElementById('sign-in-discord').textContent = 'Sign in with Discord';
      document.getElementById('sign-in-discord').style.display = 'block';
      document.getElementById('sign-out').style.display = 'none';
    }

    if (linkDiscord) {
      linkDiscord = false;
      signInTwitter();
    } else {
      document.getElementById('user-menu').disabled = false;
    }
  });

  document.getElementById('sign-in-twitter').addEventListener('click', signInTwitter, false);
  document.getElementById('sign-in-discord').addEventListener('click', signInDiscord, false);
  document.getElementById('sign-out').addEventListener('click', signOut, false);
}

document.addEventListener('DOMContentLoaded', initAuth);