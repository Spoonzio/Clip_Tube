// Constants
const REDIR_LINK = "https://127.0.0.1:5500/landing.html";
const CLIENT_ID = "v7d9o082r94y6vqrgavnhju4blgr36";
const CLIENT_SERCRET = ""; // removed
const CLIP_PER_ROW = 3;

// Global vars
let AUTH_OBJECT;
let OAUTH_TOKEN;
let USER_OBJ;

function genLoginLink() {
    let loginButton = document.getElementById("loginButton");
    let loginLink = "https://id.twitch.tv/oauth2/authorize?client_id=" + CLIENT_ID + "&redirect_uri=" + REDIR_LINK + "&response_type=code&scope=";

    loginButton.setAttribute("href", loginLink);
}

function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function getAuth() {
    let urlEncodedDataPairs = [];

    // Turn the data object into an array of URL-encoded key/value pairs.
    let accessCode = getParameterByName("code");

    urlEncodedDataPairs.push(encodeURIComponent("client_secret") + '=' + encodeURIComponent(CLIENT_SERCRET));
    urlEncodedDataPairs.push(encodeURIComponent("client_id") + '=' + encodeURIComponent(CLIENT_ID));
    urlEncodedDataPairs.push(encodeURIComponent("code") + '=' + encodeURIComponent(accessCode));
    urlEncodedDataPairs.push(encodeURIComponent("grant_type") + '=' + encodeURIComponent("authorization_code"));
    urlEncodedDataPairs.push(("redirect_uri") + '=' + (REDIR_LINK));

    // Combine the pairs into a single string and replace all %-encoded spaces to
    // the '+' character; matches the behavior of browser form submissions.
    let url = "https://id.twitch.tv/oauth2/token";
    url += "?" + urlEncodedDataPairs.join('&').replace(/%20/g, '+');

    fetch(url, { method: 'POST' })
        .then(results => results.json())
        .then(data => { AUTH_OBJECT = data });
}

async function getUserID() {
    let getUserURL = "https://api.twitch.tv/helix/users";
    OAUTH_TOKEN = 'Bearer ' + AUTH_OBJECT.access_token;

    return fetch(getUserURL, {
        method: 'GET',
        headers: {
            'Authorization': OAUTH_TOKEN,
            'Client-Id': CLIENT_ID
        }
    })
        .then(response => response.json())
        .then(responseData => {
            USER_OBJ = responseData.data[0];
            return responseData;
        })
        .catch(error => console.warn(error));

}

async function getFollowedChan() {
    // Get UserID
    return getUserID()
        .then(userData => {
            let getChannelsURL = "https://api.twitch.tv/helix/users/follows";
            getChannelsURL += "?from_id=";
            getChannelsURL += USER_OBJ.id;
            return getChannelsURL;
        })
        .then(chanUrl => {
            // Call followed channels using OAuth
            return fetch(chanUrl, {
                method: 'GET',
                headers: {
                    'Authorization': OAUTH_TOKEN,
                    'Client-Id': CLIENT_ID
                }
            });
        })
        .then(response => {
            return response.json();
        })
        .then(channelData => {
            return channelData;
        })
        .catch(error => {
            console.warn(error)
        });
}

// If clip count is not given, return 20 clip data (max)
async function getClips(channelID, clipCount, pageToken) {
    // channelID, gameID, or clipID

    // Call Clip endpoint
    let channelClipsURL = "https://api.twitch.tv/helix/clips?broadcaster_id=" + channelID;
    return fetch(channelClipsURL, {
        method: 'GET',
        headers: {
            'Authorization': OAUTH_TOKEN,
            'Client-Id': CLIENT_ID
        }
    })
        .then(response => {
            return response.json();
        })
        .then(clipData => {

            // Get first n clips, trim the rest
            if (clipCount !== null && clipCount === parseInt(clipCount)) {
                clipData.data = clipData.data.slice(0, clipCount);
            }
            return clipData;
        })
        .catch(error => {
            console.warn(error);
        });
}

function displayClips(followRelaObj, channelRowDiv) {
    getClips(followRelaObj.to_id, CLIP_PER_ROW)
        .then(clipsData => {
            let channelClipCols = clipsData.data.map(clipObj => {
                // Main div for clip block
                let clipDiv = document.createElement("div");
                clipDiv.setAttribute("class", "col");
                clipDiv.setAttribute("data-clip-id", clipObj.id);

                let clipURL = document.createElement("a");
                clipURL.setAttribute("href", clipObj.url);
                clipURL.setAttribute("target", "_blank")


                // Thumbnail (TODO: onclick = popup modal)
                let clipThumbnail = document.createElement("img");
                clipThumbnail.src = clipObj.thumbnail_url;
                clipThumbnail.setAttribute("class", "clipThumbnail");
                clipURL.appendChild(clipThumbnail);

                let clipTitle = document.createElement("p");
                clipTitle.setAttribute("class", "clipTitle")
                clipTitle.innerHTML = clipObj.title;

                clipDiv.appendChild(clipURL);
                clipDiv.appendChild(clipTitle);
                channelRowDiv.appendChild(clipDiv);
            })

            return channelClipCols;
        });

}

function displayChannels() {

    getFollowedChan()
        .then(channelData => {
            let followedChan = channelData.data;
            let channelDiv = document.getElementById("channelsDiv");

            for (let relIndex in followedChan) {
                let followRelObj = followedChan[relIndex];

                // Div for channel rows
                let channelRowDiv = document.createElement("div");
                channelRowDiv.setAttribute("class", "row");
                channelRowDiv.setAttribute("data-channel-id", followRelObj.to_id);

                // Title for channel rows
                let channelTitle = document.createElement("p");
                channelTitle.setAttribute("class", "display-4");
                channelTitle.innerHTML = followRelObj.to_name + "\'s clip";
                channelRowDiv.appendChild(channelTitle);

                // 3 col for clips, most recent
                // Get 3 most recent clips from channel
                displayClips(followRelObj, channelRowDiv);

                // Append to HTML
                channelDiv.appendChild(channelRowDiv);
            }
        }).catch(error => {
            console.warn(error);
        })
}
