var cb = new Codebird;
cb.setConsumerKey("dYbrcnqmIC2TO0E0ROlYpSe44", "4xQJb0oFVoz2mSWnmikxng4nKjMViIwWYkKGpJ2H9jdrORBsCo");

var vm = new Vue({
    el: 'body',
    data: {
        loggedIn: false,
        beenHere: simpleStorage.hasKey('beenHere'),
        recommendations: [],
        tweets: [],
        newTweets: []
    },
    methods: {
        loadNewTweets: function (e) {
            e.preventDefault();

            this.tweets = this.newTweets.concat(this.tweets);
            this.newTweets = [];
        },
        follow: function (index, e) {
            e.preventDefault();
            cb.__call(
                "friendships_create",
                {
                    id: this.recommendations[index].id,
                    follow: "true"
                },
                function (reply, rate, err) {
                    if (err) {
                        console.log("error response or timeout exceeded" + err.error);
                    }
                    if (reply && reply.hasOwnProperty('name')) {
                        console.log("USER:"+reply);
                        console.log("INDEX:"+index);
                        vm.recommendations[index] = reply;
                        var rec = vm.recommendations;
                        vm.recommendations = [];
                        vm.$set('recommendations', rec);
                    }
                }
            );
        },
        signIn: function (e) {
            e.preventDefault();
            // gets a request token
            cb.__call(
                "oauth_requestToken",
                {oauth_callback: "oob"},
                function (reply, rate, err) {
                    if (err) {
                        console.log("error response or timeout exceeded" + err.error);
                    }
                    if (reply) {
                        // stores it
                        cb.setToken(reply.oauth_token, reply.oauth_token_secret);

                        // gets the authorize screen URL
                        cb.__call(
                            "oauth_authorize",
                            {},
                            function (auth_url) {
                                window.codebird_auth = window.open(auth_url);
                                $('#signInModal').modal()
                            }
                        );
                    }
                }
            );
        },
        signOut: function (e) {
            this.loggedIn = false;
            e.preventDefault();
            // cb.logout();
            simpleStorage.flush();
            lastTweetId = null;
            this.beenHere = false;
            this.recommendations = [];
        },
        closeFollowing: function (e) {
            e.preventDefault();
            this.beenHere = true;
        }
    }
});

var token = simpleStorage.get('token');
var secret = simpleStorage.get('secret');
if (token && secret)
{
    vm.loggedIn = true;
    cb.setToken(token, secret);
    getTimeleine(true);
}

var lastApiCalled = (new Date()).getTime();
var lastTweetId;
var intervalID = window.setInterval(refreshTimeline, 1000);

$(function () {

    $('#twitterPinSubmit').click(function (e) {
        e.preventDefault();
        pin = $('#twitterPin').val();

        if (pin) {
            cb.__call(
                "oauth_accessToken",
                {oauth_verifier: pin},
                function (reply, rate, err) {
                    if (err) {
                        console.log("error response or timeout exceeded" + err.error);
                        alert('Failed to authenticate user.');
                    }
                    if (reply) {
                        console.log("OATH TOKEN: " + reply.oauth_token);
                        console.log("OATH TOKEN SECRET: " + reply.oauth_token_secret);
                        cb.setToken(reply.oauth_token, reply.oauth_token_secret);
                        simpleStorage.set('token', reply.oauth_token);
                        simpleStorage.set('secret', reply.oauth_token_secret);
                        simpleStorage.set('beenHere', true);
                        vm.loggedIn = true;

                        if (!vm.beenHere) {
                            getWhoToFollow();
                        }
                        getTimeleine(true);
                    } else {
                        alert('Failed to authenticate user.');
                    }
                    $('#twitterPin').val('');
                    $('#signInModal').modal('hide');
                }
            );
        } else {
            $('#twitterPin').addClass('error');
        }
    });

});

function getWhoToFollow() {
    cb.__call(
        "users_lookup",
        {
            screen_name: 'jack,yukihiro_matz,JeffBezos'
        },
        function (reply, rate, err) {
            if (err) {
                console.log("error response or timeout exceeded" + err.error);
            }
            if (reply) {
                console.log(reply);
                vm.recommendations = reply;
            }
        }
    );
}

function getTimeleine(show) {
    cb.setToken(simpleStorage.get('token'), simpleStorage.get('secret'));
    var param = lastTweetId ? {since_id: lastTweetId} : {};
    lastApiCalled = (new Date).getTime();
    cb.__call(
        "statuses_homeTimeline",
        param,
        function (reply, rate, err) {
            if (err) {
                console.log("error response or timeout exceeded" + err.error);
            }
            if (reply) {
                console.log(reply);
                if (reply.hasOwnProperty('error'))
                    return console.log('ERROR');
                if (reply.length > 0) {
                    lastTweetId = reply[0].id;
                    if (show)
                        vm.tweets = reply;
                    else if (reply[0].id != vm.tweets[0].id) {
                        vm.newTweets = vm.newTweets.concat(reply);
                    }
                }
            }
        }
    );
}

function refreshTimeline() {
    var secs = $('#refreshTimeline').val();
    if (secs > 0) {
        var percent = ((new Date).getTime() - lastApiCalled) / (secs * 1000) * 100;
        if (percent >= 100) {
            lastApiCalled = (new Date).getTime();
            getTimeleine(false);
        } else {
            $('#progress').css('width', percent + "%");
        }
    } else {
        lastApiCalled = (new Date).getTime();
    }
}