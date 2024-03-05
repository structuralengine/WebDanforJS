import { Injectable } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { ElectronService } from './electron.service';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { Firestore, collection, doc, getDocs, getFirestore, onSnapshot } from '@angular/fire/firestore';

const APP = 'WebDan';
const USER_PROFILE = 'userProfile';
const CLIENT_ID = 'clientId';

interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserInfoService {
  
  public uid: string = '';
  public deduct_points: number = 0;
  public daily_points: number = 0;
  public userProfile: UserProfile | null = null;
  public clientId: string = null;
  public activeSession: string = null;

  constructor(
    public electronService: ElectronService,
    private readonly keycloak: KeycloakService,
    private db: Firestore,
  ) {
    this.db = getFirestore();
    const clientId = window.sessionStorage.getItem(CLIENT_ID);
    if (clientId) {
      this.clientId = clientId;
    } else {
      this.clientId = nanoid();
      window.sessionStorage.setItem(CLIENT_ID, this.clientId);
    }
    
    this.initializeUserProfile();
  }

  async initializeUserProfile() {
    if (this.electronService.isElectron) {
      const userProfile = window.localStorage.getItem(USER_PROFILE);
      if (userProfile) {
        this.setUserProfile(JSON.parse(userProfile));
      } else {
        this.setUserProfile(null);
      }
    } else {
      const isLoggedIn = await this.keycloak.isLoggedIn();
      if (isLoggedIn) {
        const keycloakProfile = await this.keycloak.loadUserProfile();
        this.setUserProfile({
          uid: keycloakProfile.id,
          email: keycloakProfile.email,
          firstName: keycloakProfile.firstName,
          lastName: keycloakProfile.lastName,
        });
      } else {
        this.setUserProfile(null);
      }
    }
  }

  setUserProfile(userProfile: UserProfile | null) {
    this.userProfile = userProfile;
    window.localStorage.setItem(USER_PROFILE, JSON.stringify(userProfile));
    if (this.userProfile) {
      this.setActiveSession();
      onSnapshot(doc(this.db, "sessions", this.userProfile.uid, "active_sessions", APP), (doc) => {
        this.activeSession = doc.data().session_id;
      });
    } else {
      this.activeSession = null;
    }
  }

  setActiveSession() {
    if (this.userProfile) {
      axios.post('https://asia-northeast1-strcutural-engine.cloudfunctions.net/manage-session/', {
        uid: this.userProfile.uid,
        app: APP,
        session_id: this.clientId,
      });
    }
  }

  public clear(uid: string): void{
    this.uid = uid;
    this.deduct_points = 0;
    this.daily_points = 0;
  }

  public setUserPoint(_deduct_points: number, _daily_points: number){
    this.deduct_points += _deduct_points;
    this.daily_points = Math.max(this.daily_points, _daily_points);
  }
  
}