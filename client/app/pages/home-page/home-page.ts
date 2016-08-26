import {Component} from '@angular/core';
import {NavController, Alert, Modal} from 'ionic-angular';
import {EventService} from '../../services/event-services';
import {UserService} from '../../services/user-services';
import {Events} from 'ionic-angular';
import {ListenInterventPage} from '../listen-intervent-page/listen-intervent-page';

import {LoginPage} from '../modals/login/login-modal';
import {SignupPage} from '../modals/signup/signup-modal';

declare var io: any;

@Component({
  templateUrl: 'build/pages/home-page/home-page.html',
  providers: [EventService, UserService]
})
export class HomePage {
  private mobile=window.localStorage.getItem("platform");
	private events = [];

  constructor(private evts: Events, private nav: NavController, private es: EventService, private us: UserService) {
  }
  
  ionViewWillEnter(){
	  this.updateEvents();
  }

  updateEvents(){
    let _events = [];

    this.es.getPublicEvents().map(res=> res.json()).subscribe((data) => {
      data.data.forEach(event =>{
        event.expanded=false;
        
        //FINDS AND MERGES SESSIONS
        let _sessions = [];
        this.es.getSessions(event._id).map(res=>res.json()).subscribe(data=>{
          data.data.forEach(session =>{
            session.expanded=false;
            //FINDS AND MERGES INTERVENTS
            let _intervents = [];
            this.es.getIntervents(session._id).map(res=>res.json()).subscribe(data=>{
              data.data.forEach(intervent =>{
                _intervents.push(intervent);
                session.intervents=_intervents;
              })
            });
            _sessions.push(session);
            event.sessions=_sessions;
          })
        })
        _events.push(event);
        this.events = _events;
      });
    });
  }
  openEvent(eventToOpen){
    let confirm = Alert.create({
            title: 'Accedi o Registrati per seguire questo Evento',
            message: 'Hai bisogno di un profilo per seguire questo evento!',
            buttons: [
            {
                text: 'Accedi',
                handler: () => {
                  this.evts.subscribe('openEvent', () => {
                    //METTE L'EVENTO TRA QUELLI A CUI HA PARTECIPATO
                    //IMPOSTA LA PAGINA ROOT A PERSONAL PAGE
                    //PUSHA LA PAGINA DI ASCOLTO DELL'EVENTO
                  });
                  let modal = Modal.create(LoginPage);
                  this.nav.present(modal);
                }
            },
            {
                text: 'Registrati',
                handler: () => {
                  //PRESENTA IL MODAL DI REGISTRAZIONE
                  //PRESENTA IL MODAL DI LOGIN
                  //METTE L'EVENTO TRA QUELLI A CUI HA PARTECIPATO
                  //IMPOSTA LA PAGINA ROOT A PERSONAL PAGE
                  //PUSHA LA PAGINA DI ASCOLTO DELL'EVENTO
                }
            },
            {
                text: 'Annulla'
            }
            ]
        });
        this.nav.present(confirm);
        /*
    this.events.forEach(event => {
      if(event._id==eventToOpen._id){
        console.log(event);
        event.sessions.forEach(session => {
          if(session.status=="ongoing"){
            console.log(session);
            session.intervents.forEach(intervent => {
              if(intervent.status=="ongoing"){
                console.log(intervent);
                this.nav.push(ListenInterventPage,{intervent: intervent})
              }
            });
          }
        });
      }
    });
    */
  }
  formatDate(date: string): string{
    let formattedDate = "";
    let dateObject = new Date(date);

    let day=dateObject.getDate();
    let month=dateObject.getMonth() + 1;
    let year=dateObject.getFullYear();
    let hours=dateObject.getUTCHours();
    let minutes=dateObject.getUTCMinutes();
    if(hours<10){
      formattedDate = day + "/" + month + "/" + year + " ORE: 0" + hours;
    }else{
      formattedDate = day + "/" + month + "/" + year + " ORE: " + hours;
    }
    if(minutes<10){
      formattedDate += ".0" + minutes;
    }else{
      formattedDate += "." + minutes;
    }
    return formattedDate;
  }
}


  
  