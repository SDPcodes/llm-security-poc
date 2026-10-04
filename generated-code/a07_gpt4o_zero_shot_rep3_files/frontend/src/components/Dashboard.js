import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfileForm from './ProfileForm';

const Dashboard = () => {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: token },
        });
        setProfile(response.data);
      } catch (error) {
        alert('Failed to fetch profile!');
      }
    };

    fetchProfile();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Profile Information</h2>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>
      <ProfileForm profile={profile} setProfile={setProfile} />
    </div>
  );
};

export default Dashboard;
