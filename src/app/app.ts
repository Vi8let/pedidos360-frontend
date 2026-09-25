import { Component } from "@angular/core";
import {
  signInWithRedirect,
  signOut,
  fetchAuthSession,
  getCurrentUser
} from 'aws-amplify/auth'

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  usuario = '';
  token = '';
  autenticado = false;
  mostrandoPedidos = false;

  async login(){
    await signInWithRedirect();
  }
  async logout(){
    await signOut();
    this.autenticado = false;
    this.mostrandoPedidos = false;
  }
  async verSesion(){
    try{
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      this.usuario = user.username;
      this.token = session.tokens?.accessToken?.toString()??'';
      this.autenticado = true;
      console.log("Usuario:",user);
      console.log("Access Token:",session.tokens?.accessToken?.toString())
    }
    catch(Error){
      console.log("No existe sesion",Error);
      this.autenticado = false;
    }
  }

  async verPedidos() {
    console.log("Ver pedidos clickeado");
    this.mostrandoPedidos = !this.mostrandoPedidos;
    // Aquí puedes agregar la lógica para obtener los pedidos usando el token
  }
}