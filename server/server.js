var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var passport	= require('passport');
var config      = require('./config/database'); // get db config file
var User        = require('./app/models/user'); // get the mongoose model
var port        = process.env.PORT || 8080;
var jwt         = require('jwt-simple');
var Event = require('./app/models/event');
var Session = require('./app/models/session');
var Intervent = require('./app/models/intervent');
var bcryptjs = require('bcryptjs');

//MONGO CLIENT
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8100');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,X-Requested-With,Content-Type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// get our request parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
 
// log to console
app.use(morgan('dev'));
 
// Use the passport package in our application
app.use(passport.initialize());
 
// demo Route (GET http://localhost:8080)
app.get('/', function(req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});
 
// Start the server
app.listen(port);
console.log('There will be dragons: http://localhost:' + port);

// demo Route (GET http://localhost:8080)
// ...
 
// connect to database
mongoose.connect(config.database);
 
// pass passport for configuration
require('./config/passport')(passport);
 
// bundle our routes
var apiRoutes = express.Router();
 
// create a new user account (POST http://localhost:8080/api/signup)
apiRoutes.post('/signup', function(req, res) {
    console.log(req.body);
  if (!req.body.username || !req.body.password || !req.body.name || !req.body.surname) {
    res.json({success: false, msg: 'Passaggio di parametri incompleto'});
  } else {
    var newUser = new User({
        name: req.body.name,
        surname: req.body.surname,
        username: req.body.username,
        password: req.body.password,
        email: req.body.email
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
                console.log(err);
        return res.json({success: false, msg: 'Username già esistente'});
      }
      res.json({success: true, msg: 'Nuovo utente creato con successo'});
    });
  }
});
 
// connect the api routes under /api/*
app.use('/api', apiRoutes);

// create a new user account (POST http://localhost:8080/signup)
// ...
 
// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (err) throw err;
 
    if (!user) {
      res.send({success: false, msg: 'Autenticazione fallita, Utente non trovato'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(user, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.send({success: false, msg: 'Autenticazione fallita, Password non valida'});
        }
      });
    }
  });
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
// ...
 
// route to a restricted info (GET http://localhost:8080/api/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      username: decoded.username
    }, function(err, user) {
        if (err) throw err;
 
        if (!user) {
          return res.status(403).send({success: false, msg: 'Autenticazione fallita, Utente non trovato'});
        } else {
          res.json({success: true, data: user});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'Nessun token ricevuto'});
  }
});
 
getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

//NEW 

apiRoutes.get('/publicevents', function(req, res) {

    Event.find({
      public: true
    }, function(err, eventsArray) {
        if (err) throw err;
 
        if (!eventsArray) {
          return res.send({success: false, msg: 'Nessun evento pubblico trovato'});
        } 
        
        res.json({success: true, data: eventsArray});
    });
});
apiRoutes.post('/sessions', function(req, res) {

    Session.find({
      event: req.body.event
    }, function(err, sessionsArray) {
        if (err) throw err;
 
        if (!sessionsArray) {
          return res.send({success: false, msg: 'Nessuna sessione trovata per questo Evento'});
        } 
        
        res.json({success: true, data: sessionsArray});
    });
});
apiRoutes.post('/intervents', function(req, res) {

    Intervent.find({
      session: req.body.session
    }, function(err, interventsArray) {
        if (err) throw err;
 
        if (!interventsArray) {
          return res.send({success: false, msg: 'Nessun intervento trovato per questa Sessione'});
        } 
        
        res.json({success: true, data: interventsArray});
    });
});

apiRoutes.get('/personalevents', function(req, res) {
    var token = getToken(req.headers);
    if (token) {
        var decoded = jwt.decode(token, config.secret);
        Event.find({
            organizer: 'user9'//decoded.username
        }, function(err, eventsArray) {
            if (err) throw err;

            if (!eventsArray) {
              return res.send({success: false, msg: 'Nessun evento per questo utente trovato'});
            } 

            res.json({success: true, data: eventsArray});
        });
    }else{
        return res.status(403).send({success: false, msg: 'Nessun token ricevuto'});
    }
});

apiRoutes.post('/createevent', function(req, res) {
    var token = getToken(req.headers);
    if (token) {
      if (!req.body.title || !req.body.date || !req.body.location || !req.body.organizer) {
        res.json({success: false, msg: 'Passaggio di parametri incompleto'});
      } else {
        var newEvent = new Event({
            title: req.body.title,
            date: req.body.date,
            location: req.body.location,
            organizer: req.body.organizer,
            public: true
        });
        newEvent.save(function(err) {
          if (err) {
            console.log(err);
            return res.json({success: false, msg: 'Errore di creazione Evento'});
          }
            //CREATES A SINGLE SESSION
            var newSession = new Session({
                title: newEvent.title,
                date: newEvent.date,
                speakers: [newEvent.organizer],
                event: newEvent._id
            });
            newSession.save(function(err) {
              if (err) {
                console.log(err);
                return res.json({success: false, msg: 'Errore di creazione Evento'});
              }
                //CREATES A SINGLE INTERVENT
                var newIntervent = new Intervent({
                    title: newEvent.title,
                    date: newEvent.date,
                    speaker: newEvent.organizer,
                    session: newSession._id
                });
                newIntervent.save(function(err) {
                  if (err) {
                    console.log(err);
                    return res.json({success: false, msg: 'Errore di creazione Evento'});
                  }
                  res.json({success: true, msg: 'Nuovo evento creato con successo', id: newEvent._id});
                });
            });
        });
      }
    }else{
        return res.status(403).send({success: false, msg: 'Nessun token ricevuto'});
    }
});

apiRoutes.post('/createsession', function(req, res) {
    console.log(req.body);
    var token = getToken(req.headers);
    if (token) {
      if (!req.body.title || !req.body.date || !req.body.speakers || !req.body.event) {
        res.json({success: false, msg: 'Passaggio di parametri incompleto'});
      } else {
          Event.findOne({
            _id: req.body.event
          }, function(err, event) {
              if(err){
                  return res.json({success: false, msg: 'Errore di creazione Sessione, Nessun Evento trovato con ID ricevuto'});
              }
              var newSession = new Session({
                  title: req.body.title,
                  date: req.body.date,
                  speakers: req.body.speakers,
                  event: req.body.event
              });
              newSession.save(function(err) {
                  if (err) {
                    console.log(err);
                    return res.json({success: false, msg: 'Errore di creazione Sessione'});
                  }
                    //CREATES A SINGLE INTERVENT
                    var newIntervent = new Intervent({
                        title: newSession.title,
                        date: newSession.date,
                        speaker: newSession.speakers[0],
                        session: newSession._id
                    });
                    newIntervent.save(function(err) {
                        if (err) {
                            console.log(err);
                            return res.json({success: false, msg: 'Errore di creazione Sessione'});
                        }
                        res.json({success: true, msg: 'Nuova sessione creata con successo', id: newSession._id});
                    });
                });
          });
      }
    }else{
        return res.status(403).send({success: false, msg: 'Nessun token ricevuto'});
    }
});

apiRoutes.post('/createintervent', function(req, res) {
    console.log(req.body);
    var token = getToken(req.headers);
    if (token) {
      if (!req.body.title || !req.body.date || !req.body.speaker || !req.body.session) {
        res.json({success: false, msg: 'Passaggio di parametri incompleto'});
      } else {
          Session.findOne({
            _id: req.body.session
          }, function(err, session) {
              if(err){
                  return res.json({success: false, msg: 'Errore di creazione Intervento, Nessuna Sessione trovata con ID ricevuto'});
              }
              var newIntervent = new Intervent({
                  title: req.body.title,
                  date: req.body.date,
                  speaker: req.body.speaker,
                  session: req.body.session
              });
              newIntervent.save(function(err) {
                  if (err) {
                    console.log(err);
                    return res.json({success: false, msg: 'Errore di creazione Intervento'});
                  }
                  if(session.speakers.indexOf(req.body.speaker) == -1){//SE NON ESISTE GIA' UNO SPEAKER CON QUEL NOME 
                      //AGGIORNA GLI SPEAKER DELLA SESSIONE
                      Session.update({
                        _id: req.body.session
                      },{ $push: {
                          speakers: req.body.speaker
                      }}, {multi: false}, function(err, result) {
                          if (err) throw err;

                          if (!result) {
                            return res.json({success: false, msg: 'Errore di aggiornamento Sessione'});
                          } 
                      });
                  }
                  res.json({success: true, msg: 'Nuovo intervento creato con successo', id: newIntervent._id});
              });
          });
      }
    }else{
        return res.status(403).send({success: false, msg: 'Nessun token ricevuto'});
    }
});

apiRoutes.post('/updateuser', function(req, res) {
    var token = getToken(req.headers);
    if (token) {
        var decoded = jwt.decode(token, config.secret);
        User.update({
          _id: decoded._id
        },{ $set: { 
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email
        }}, {multi: false}, function(err, result) {
            if (err) throw err;

            if (!result) {
              return res.status(403).send({success: false, msg: 'Aggiornamento utente fallito'});
            } else {
              res.json({success: true, msg: "Aggiornamento utente eseguito"});
            }
        });
    } else {
        return res.status(403).send({success: false, msg: 'Nessun token ricevuto'});
    }
});

apiRoutes.post('/updatepassword', passport.authenticate('jwt', { session: false}), function(req, res) {
    var token = getToken(req.headers);
    if (token) {
    var decoded = jwt.decode(token, config.secret);
        User.findOne({
            _id: decoded._id
        }, function(err, user) {
            if (err) throw err;
            
            if (!user) {
              return res.send({success: false, msg: 'Autenticazione fallita, Utente non trovato'});
            } else {
                bcryptjs.compare(req.body.oldPassword, user.password, function (err, isMatch) {
                    if (err) {
                        return res.send({success: false, msg: 'Errore nella comparazione della password'}); 
                    }
                    if(isMatch){
                        var newPassword;
                        bcryptjs.genSalt(10, function (err, salt) {
                            if (err) {
                                return (err);
                            }
                            bcryptjs.hash(req.body.newPassword, salt, function (err, hash) {

                                if (err) {
                                    return (err);
                                }
                                newPassword = hash;
                                console.log("ECCOLA NUOVA "+newPassword)
                                User.update({
                                  _id: decoded._id
                                },{ $set: { 
                                    password: newPassword,
                                }}, {multi: false}, function(err, result) {
                                    if (err) throw err;

                                    if (!result) {
                                      return res.send({success: false, msg: 'Aggiornamento fallito'});
                                    } else {
                                      res.json({success: true, msg: "Password Aggiornata"});
                                    }
                                });
                            });
                        });
                    }else{
                        return res.send({success: false, msg: 'Autenticazione fallita, Password errata'});
                    }
                    console.log("OK: "+isMatch);
                });
            }
        });
    } else {
        return res.send({success: false, msg: 'Nessun token ricevuto'});
    }
});