import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/profile');
        setProfile(response.data);
      } catch (error) {
        alert('Error fetching profile');
      }
    };
    fetchProfile();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>
      <Profile />
    </div>
  );
}

function Profile() {
  const [formData, setFormData] = useState({ username: '', email: '' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/profile', formData, { headers: { 'X-CSRF-Token': document.cookie['csrfToken'] } });
      alert('Profile updated');
    } catch (error) {
      alert('Error updating profile');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="New Username" onChange={handleInputChange} required />
      <input type="email" name="email" placeholder="New Email" onChange={handleInputChange} required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default Dashboard;
