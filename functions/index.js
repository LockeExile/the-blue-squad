'use strict';

const functions = require('firebase-functions');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const request = require('superagent');

// Firebase Setup
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
});

const OAUTH_REDIRECT_URI = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/popup.html`;
const OAUTH_SCOPES = 'identify';

/**
 * Creates a configured simple-oauth2 client for Discord.
 */
function discordOAuth2Client() {
  const credentials = {
    client: {
      id: functions.config().discord.client_id,
      secret: functions.config().discord.client_secret
    },
    auth: {
      tokenHost: 'https://discordapp.com',
      tokenPath: '/api/oauth2/token',
      revokePath: '/api/oauth2/token/revoke',
      authorizePath: '/api/oauth2/authorize'
    }
  };
  return require('simple-oauth2').create(credentials);
}

/**
 * Redirects the User to the Discord authentication consent screen. Also the 'state' cookie is set for later state
 * verification.
 */
exports.redirect = functions.https.onRequest((req, res) => {
  const oauth2 = discordOAuth2Client();

  cookieParser()(req, res, () => {
    const state = req.cookies.state || crypto.randomBytes(20).toString('hex');
    console.log('Setting verification state:', state);
    res.cookie('state', state.toString(), {maxAge: 3600000, secure: true, httpOnly: true});
    const redirectUri = oauth2.authorizationCode.authorizeURL({
      redirect_uri: OAUTH_REDIRECT_URI,
      scope: OAUTH_SCOPES,
      state: state
    });
    console.log('Redirecting to:', redirectUri);
    res.redirect(redirectUri);
  });
});

/**
 * Exchanges a given Discord auth code passed in the 'code' URL query parameter for a Firebase auth token.
 * The request also needs to specify a 'state' query parameter which will be checked against the 'state' cookie.
 * The Firebase custom auth token, display name, photo URL and Discord access token are sent back in a JSONP callback
 * function with function name defined by the 'callback' query parameter.
 */
exports.token = functions.https.onRequest((req, res) => {
  const oauth2 = discordOAuth2Client();

  try {
    cookieParser()(req, res, () => {
      console.log('Received verification state:', req.cookies.state);
      console.log('Received state:', req.query.state);
      if (!req.cookies.state) {
        throw new Error('State cookie not set or expired. Maybe you took too long to authorize. Please try again.');
      } else if (req.cookies.state !== req.query.state) {
        throw new Error('State validation failed');
      }
      console.log('Received auth code:', req.query.code);
      oauth2.authorizationCode.getToken({
        code: req.query.code,
        redirect_uri: OAUTH_REDIRECT_URI
      }).then(results => {
        console.log('Auth code exchange result received:', results);

        // Got access token, now use it to get user identity
        request.get("https://discordapp.com/api/users/@me")
          .set('Authorization', `${results.token_type} ${results.access_token}`)
          .set('Accept', 'application/json')
          .end(function(err, response) {
            if (err) {
              console.log(err);
              throw err;
            }

            const discordUser = response.body;
            console.log('Discord identity received:', discordUser);

            // Create a Firebase account and get the Custom Auth Token.
            createFirebaseAccount(discordUser, results.access_token)
              .then(firebaseToken => {
                // Serve an HTML page that signs the user in and updates the user profile.
                res.jsonp({token: firebaseToken});
              });
          });
      });
    });
  } catch (error) {
    return res.jsonp({error: error.toString});
  }
});

/**
 * Creates a Firebase account with the given user profile and returns a custom auth token allowing
 * signing-in this account.
 * Also saves the accessToken to the datastore at /discordAccessToken/$uid
 *
 * @returns {Promise<string>} The Firebase custom auth token in a promise.
 */
function createFirebaseAccount(discordUser, accessToken) {
  // The UID we'll assign to the user.
  const uid = `discord:${discordUser.id}`;
  const avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.jpg`;

  // Save the access token tot he Firebase Realtime Database.
  const tokenTask = admin.database().ref(`/discordAccessToken/${uid}`)
      .set(accessToken);

  // Save the discord user data
  const userDataTask = admin.database().ref(`/players/${uid}/discord`)
      .set(discordUser);

  // Try creating the user
  const userCreationTask = admin.auth().createUser({
    uid: uid,
    displayName: discordUser.username,
    photoURL: avatarUrl
  }).then(
    result => {
      admin.database().ref(`/players/${uid}`).update({
        name: discordUser.username,
        avatarSource: 'discord',
        avatar: avatarUrl
      });
    },
    error => { // catch already-exists error
      if (error.code !== 'auth/uid-already-exists') { throw error; }

      // update avatar if set to discord
      return admin.database().ref(`/players/${uid}`).once('value').then(snapshot => {
        if (snapshot.val().avatarSource === 'discord') {
          admin.database().ref(`/players/${uid}/avatar`).set(avatarUrl);
          return admin.auth().updateUser(uid, { photoURL: avatarUrl });
        }
      });
  });

  // Wait for all async task to complete then generate and return a custom auth token.
  return Promise.all([tokenTask, userDataTask, userCreationTask]).then(() => {
    // Create a Firebase custom auth token.
    const token = admin.auth().createCustomToken(uid);
    console.log('Created Custom token for UID "', uid, '" Token:', token);
    return token;
  });
}