import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import taxxi from '../assets/taxxi.png';

const IdVerification = () => {
    const [file, setFile] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Add effect to check if user is already verified
    useEffect(() => {
        const checkVerification = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const response = await axios.get('http://localhost:5000/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data && response.data.id_verified) {
                    navigate('/dashboard', { replace: true });
                }
            } catch (error) {
                console.error('Error checking verification status:', error);
            }
        };

        checkVerification();
    }, [navigate]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) {
                setError('File size should be less than 5MB');
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(selectedFile.type)) {
                setError('Only JPEG, PNG, and JPG files are allowed');
                return;
            }
            setFile(selectedFile);
            setUploadedFileName(selectedFile.name);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select an ID image');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('idImage', file);

        try {
            const token = localStorage.getItem('token');
            console.log('Submitting ID verification...');
            
            const response = await axios.post(
                'http://localhost:5000/api/auth/verify-id',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            console.log('Verification response:', response.data);

            if (response.data && response.data.user) {
                // Update the user data in localStorage
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const updatedUser = { ...currentUser, ...response.data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // Redirect based on user role
                const destination = updatedUser.role === 'driver' ? '/driver-dashboard' : '/dashboard';
                window.location.href = destination;
            } else {
                setError('Verification response was invalid. Please try again.');
            }
        } catch (err) {
            console.error('ID verification error:', err);
            setError(err.response?.data?.message || 'Error uploading ID. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <img src={taxxi} alt="TAXXi Logo" style={styles.logo} />
            <div style={styles.formContainer}>
                <h2 style={styles.title}>ID Verification</h2>
                <p style={styles.subtitle}>Please upload a clear photo of your ID for verification</p>

                {error && (
                    <div style={styles.errorContainer}>
                        <AlertCircle style={styles.errorIcon} />
                        <p style={styles.errorText}>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.uploadContainer}>
                        <label style={styles.uploadLabel}>
                            <div style={styles.uploadContent}>
                                {uploadedFileName ? (
                                    <div style={styles.uploadedFile}>
                                        <CheckCircle2 style={styles.checkIcon} />
                                        <span style={styles.fileName}>{uploadedFileName}</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload style={styles.uploadIcon} />
                                        <p style={styles.uploadText}>
                                            <span style={styles.uploadBold}>Click to upload</span> or drag and drop
                                        </p>
                                        <p style={styles.uploadSubtext}>
                                            PNG, JPG or JPEG (MAX. 5MB)
                                        </p>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/jpeg,image/png,image/jpg"
                                style={styles.fileInput}
                            />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !file}
                        style={{
                            ...styles.button,
                            ...(loading || !file ? styles.buttonDisabled : {})
                        }}
                    >
                        {loading ? 'Uploading...' : 'Submit ID for Verification'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px',
    },
    logo: {
        width: '300px',
        maxWidth: '100%',
        height: 'auto',
        marginBottom: '20px',
        objectFit: 'contain',
    },
    formContainer: {
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    title: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: '8px',
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        textAlign: 'center',
        marginBottom: '24px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    uploadContainer: {
        width: '100%',
    },
    uploadLabel: {
        display: 'block',
        cursor: 'pointer',
        width: '100%',
    },
    uploadContent: {
        border: '2px dashed #e2e8f0',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        transition: 'border-color 0.3s ease',
        '&:hover': {
            borderColor: '#007bff',
        },
    },
    uploadIcon: {
        width: '24px',
        height: '24px',
        color: '#007bff',
        margin: '0 auto 12px',
    },
    uploadText: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '4px',
    },
    uploadBold: {
        fontWeight: '600',
        color: '#007bff',
    },
    uploadSubtext: {
        fontSize: '12px',
        color: '#999',
    },
    fileInput: {
        display: 'none',
    },
    uploadedFile: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    checkIcon: {
        width: '20px',
        height: '20px',
        color: '#10b981',
    },
    fileName: {
        fontSize: '14px',
        color: '#333',
    },
    button: {
        padding: '12px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        '&:hover': {
            backgroundColor: '#0056b3',
        },
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
        '&:hover': {
            backgroundColor: '#ccc',
        },
    },
    errorContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#fee2e2',
        borderRadius: '6px',
        marginBottom: '16px',
    },
    errorIcon: {
        width: '20px',
        height: '20px',
        color: '#dc2626',
    },
    errorText: {
        color: '#dc2626',
        fontSize: '14px',
        margin: 0,
    },
};

export default IdVerification; 