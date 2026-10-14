import React from 'react';
import { Route, Switch } from 'react-router-dom';
import LoginPage from './LoginPage';
import FileUploadPage from './FileUploadPage';

function App() {
  return (
    <div>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/files" component={FileUploadPage} />
      </Switch>
    </div>
  );
}

export default App;
