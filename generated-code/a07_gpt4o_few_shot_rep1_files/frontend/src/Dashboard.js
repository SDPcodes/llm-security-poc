import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState({ username: '', email: '' });
  const [formData, setFormData] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/profile', { withCredentials: true });
        setProfile(response.data);
      } catch (error) {
        alert('Error fetching profile');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/profile', formData, { withCredentials: true });
      alert('Profile updated successfully');
    } catch (error) {
      alert('Error updating profile');
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>

      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="New Username" onChange={handleChange} />
        <input type="email" name="email" placeholder="New Email" onChange={handleChange} />
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}

export default Dashboard;
