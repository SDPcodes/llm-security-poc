import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import App from './App';
import Login from './Login';
import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <Switch>
        <Route path="/" exact component={Login} />
        <Route path="/app" component={App} />
      </Switch>
    </Router>
  </React.StrictMode>,
  document.getElementById('root')
);
