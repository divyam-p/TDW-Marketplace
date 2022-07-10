import logo from './logo.svg';
import './App.css';
import {signInToApp, signOutOfApp, getCurrentUser} from './service/auth';
import {googleProvider, facebookProvider, githubProvider, microsoftProvider} from './config/authMethods'; 

function App() {
  const handleSignIn = async (provider) => { 
    await signInToApp(provider); 
    const user = getCurrentUser(); 
    console.log(user); 
  }; 

  const handleSignOut = async () => { 
    await signOutOfApp(); 
    const user = getCurrentUser(); 
    if (user === null){ 
      console.log("User Signed Out."); 
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={() => handleSignIn(googleProvider)}>Google</button> 
        <button onClick={() => handleSignIn(facebookProvider)}>Facebook</button> 
        <button onClick={() => handleSignIn(githubProvider)}>Github</button> 
        <button onClick={() => {microsoftProvider.setCustomParameters({
          prompt: "consent",
          tenant: "4ea69acb-08af-44a4-865f-1a4b43829c24",
          }); 
          handleSignIn(microsoftProvider)}}>Microsoft</button> 
        <button onClick={() => handleSignOut()}>Sign Out</button> 
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
