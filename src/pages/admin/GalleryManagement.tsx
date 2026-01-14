import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import galleryService, { GalleryImage } from '../../services/galleryService';
import SessionService, { SessionResponse } from '../../services/sessionService';
import CloudinaryUploadWidget from '../../components/CloudinaryUploadWidget';
import './GalleryManagement.css';

const GalleryManagement = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('multiple');
  const [imageDescription, setImageDescription] = useState<string>('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [pendingUploadResults, setPendingUploadResults] = useState<any[]>([]);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Use ref to always have the latest selectedSessionId value
  const selectedSessionIdRef = useRef<number | null>(null);

  // Get admin data from localStorage as fallback
  const getAdminData = () => {
    console.log('🔍 Getting admin data...');
    console.log('User from context:', user);
    
    // Try context first
    if (user && user.id) {
      console.log('✅ Using user from context:', user);
      return user;
    }
    
    // Try localStorage
    const storedUser = localStorage.getItem('user');
    console.log('📦 Stored user string:', storedUser);
    
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        console.log('✅ Parsed user from localStorage:', parsed);
        return parsed;
      } catch (e) {
        console.error('❌ Error parsing stored user:', e);
      }
    }
    
    // Try individual localStorage items
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    
    console.log('📦 Individual localStorage items:', { userId, userName, userRole });
    
    if (userId) {
      const fallbackUser = {
        id: userId,
        name: userName || 'Admin',
        role: userRole || 'ADMIN'
      };
      console.log('✅ Using fallback user:', fallbackUser);
      return fallbackUser;
    }
    
    // Final fallback
    console.warn('⚠️ No user data found, using default');
    return {
      id: '1',
      name: 'Admin',
      role: 'ADMIN'
    };
  };

  // Cloudinary configuration
  const cloudName = 'dnmwonmud';
  const uploadPreset = 'ml_default';

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchGalleryImages();
      // Clear the "Please select a session first" error when a session is selected
      setError(null);
    }
  }, [selectedSessionId]);

  // Sync ref with state to ensure we always have the latest value
  useEffect(() => {
    console.log('🔄 selectedSessionId changed to:', selectedSessionId);
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  const fetchSessions = async () => {
    try {
      console.log('📡 Fetching sessions...');
      const data = await SessionService.getAllSessions();
      console.log('✅ Sessions fetched:', data);
      setSessions(data);
      
      // Auto-select active session if available
      const activeSession = data.find(session => session.active);
      console.log('🔍 Active session found:', activeSession);
      
      if (activeSession) {
        console.log('✅ Setting active session ID:', activeSession.id);
        setSelectedSessionId(activeSession.id);
        setError(null); // Clear any existing errors
        console.log('✅ selectedSessionId state should now be:', activeSession.id);
      } else if (data.length > 0) {
        console.log('⚠️ No active session, using first session ID:', data[0].id);
        setSelectedSessionId(data[0].id);
        setError(null); // Clear any existing errors
        console.log('✅ selectedSessionId state should now be:', data[0].id);
      } else {
        console.warn('❌ No sessions found!');
      }
    } catch (err: any) {
      console.error('❌ Error fetching sessions:', err);
      setError(err.response?.data?.message || 'Failed to fetch sessions');
    }
  };

  const fetchGalleryImages = async () => {
    if (!selectedSessionId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await galleryService.getAllImages(selectedSessionId);
      setGalleryImages(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch gallery images');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = async (results: any[]) => {
    console.log('=== Upload Success Handler Called ===');
    console.log('Results from Cloudinary:', results);
    console.log('Selected Session ID (state):', selectedSessionId);
    console.log('Selected Session ID (ref):', selectedSessionIdRef.current);
    console.log('Upload Mode:', uploadMode);
    
    // Validate results first
    if (!results || results.length === 0) {
      console.error('❌ No results received from Cloudinary');
      setError('No images were uploaded. Please try again.');
      return;
    }

    // Store results and show description modal for single upload
    if (uploadMode === 'single') {
      setPendingUploadResults(results);
      setShowDescriptionModal(true);
      return;
    }

    // For multiple uploads, process immediately without description
    await processUpload(results, '');
  };

  const processUpload = async (results: any[], description: string = '') => {
    // Validate session ID - use ref to get the latest value
    const currentSessionId = selectedSessionIdRef.current || selectedSessionId;
    console.log('🎯 Using session ID:', currentSessionId);
    
    if (!currentSessionId) {
      console.error('❌ No session selected! State:', selectedSessionId, 'Ref:', selectedSessionIdRef.current);
      setError('Please select a session first. If a session is already selected, try refreshing the page.');
      return;
    }

    const adminData = getAdminData();
    console.log('👤 Admin Data:', adminData);

    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowDescriptionModal(false); // Close modal

    try {
      // Ensure admin data is valid - parse as number for Long conversion
      const uploaderId = adminData?.id ? parseInt(adminData.id.toString(), 10) : 1;
      const uploaderName = adminData?.name || 'Admin';
      const uploaderType = (adminData?.role === 'ADMIN' ? 'ADMIN' : 'TEACHER') as 'ADMIN' | 'TEACHER';

      console.log('📋 Uploader Info:', { uploaderId, uploaderName, uploaderType, sessionId: currentSessionId });

      if (uploadMode === 'single' && results.length > 0) {
        // Single upload with description
        const result = results[0];
        console.log('📸 Uploading single image:', result);
        
        const uploadData = {
          imageUrl: result.secureUrl,
          cloudinaryPublicId: result.publicId,
          uploadedByType: uploaderType,
          uploadedById: uploaderId,
          uploadedByName: uploaderName,
          sessionId: currentSessionId,
          title: result.originalFilename || 'Untitled',
          description: description || '',
        };
        console.log('📤 Single upload data (JSON):', JSON.stringify(uploadData, null, 2));
        
        const response = await galleryService.uploadImage(uploadData);
        console.log('✅ Single upload response:', response);
        setSuccess('Image uploaded successfully!');
        setImageDescription(''); // Reset description
      } else if (uploadMode === 'multiple' && results.length > 0) {
        // Bulk upload without descriptions
        const images = results.map(result => ({
          imageUrl: result.secureUrl,
          cloudinaryPublicId: result.publicId,
          title: result.originalFilename || 'Untitled',
          description: '',
        }));
        
        const bulkData = {
          sessionId: currentSessionId,
          images: images,
          uploadedByType: uploaderType,
          uploadedById: uploaderId,
          uploadedByName: uploaderName,
        };
        console.log('📤 Bulk upload data (JSON):', JSON.stringify(bulkData, null, 2));

        const response = await galleryService.uploadBulkImages(bulkData);
        console.log('✅ Bulk upload response:', response);
        setSuccess(`${results.length} images uploaded successfully!`);
      }

      // Refresh gallery immediately
      console.log('🔄 Refreshing gallery...');
      setTimeout(async () => {
        await fetchGalleryImages();
        console.log('✅ Gallery refreshed');
      }, 500); // Small delay to ensure backend has saved
      
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      console.error('❌ Error response data:', err.response?.data);
      console.error('❌ Error response status:', err.response?.status);
      console.error('❌ Error response headers:', err.response?.headers);
      console.error('❌ Full error object:', JSON.stringify(err.response, null, 2));
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload images';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setPendingUploadResults([]); // Clear pending results
    }
  };

  const handleUploadError = (error: any) => {
    console.error('Upload error:', error);
    if (error?.statusText === 'Upload preset not found') {
      setError(
        '⚠️ Upload Preset Not Found! Please create an unsigned upload preset named "ml_default" in your Cloudinary dashboard. ' +
        'Go to: Cloudinary Console → Settings → Upload → Add Upload Preset. ' +
        'Set name to "ml_default", signing mode to "Unsigned", and folder to "slms-gallery". ' +
        'See CLOUDINARY_UPLOAD_PRESET_SETUP.md for detailed instructions.'
      );
    } else {
      setError(error?.message || 'Upload failed. Please try again.');
    }
  };

  const handleEdit = (image: GalleryImage) => {
    setEditingImage(image);
    setEditTitle(image.title || '');
    setEditDescription(image.description || '');
    setShowEditModal(true);
  };

  const handleUpdateImage = async () => {
    if (!editingImage) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await galleryService.updateImage(editingImage.id, editTitle, editDescription);
      setSuccess('Image updated successfully!');
      setShowEditModal(false);
      setEditingImage(null);
      setEditTitle('');
      setEditDescription('');
      await fetchGalleryImages();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update image');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await galleryService.deleteImage(id);
      setSuccess('Image deleted successfully!');
      await fetchGalleryImages();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  const uwConfig = {
    cloudName,
    uploadPreset,
    multiple: uploadMode === 'multiple',
    folder: 'slms-gallery',
    tags: ['gallery', selectedSessionId?.toString() || 'unknown'],
    cropping: false,
    showAdvancedOptions: false,
    sources: ['local', 'url', 'camera'],
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    maxImageFileSize: 5000000, // 5MB
    maxFiles: uploadMode === 'multiple' ? 20 : 1,
    theme: 'default',
  };

  return (
    <div className="gallery-management">
      <div className="gallery-header">
        <h1>Gallery Management</h1>
        <p className="gallery-subtitle">Upload and manage school gallery images</p>
      </div>

      {error && !(error === 'Please select a session first' && selectedSessionId) && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)} className="alert-close">×</button>
        </div>
      )}

      <div className="gallery-controls">
        <div className="control-group">
          <label htmlFor="session-select">Select Session:</label>
          <select
            id="session-select"
            value={selectedSessionId || ''}
            onChange={(e) => {
              setSelectedSessionId(Number(e.target.value));
              setError(null); // Clear errors when session changes
            }}
            className="session-select"
          >
            <option value="">-- Select Session --</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Upload Mode:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="single"
                checked={uploadMode === 'single'}
                onChange={(e) => setUploadMode(e.target.value as 'single' | 'multiple')}
              />
              Single Image
            </label>
            <label>
              <input
                type="radio"
                value="multiple"
                checked={uploadMode === 'multiple'}
                onChange={(e) => setUploadMode(e.target.value as 'single' | 'multiple')}
              />
              Multiple Images
            </label>
          </div>
        </div>

        <div className="control-group">
          <CloudinaryUploadWidget
            uwConfig={uwConfig}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            buttonText={uploadMode === 'single' ? 'Upload Image' : 'Upload Multiple Images'}
            disabled={!selectedSessionId || loading}
          />
          {!selectedSessionId && (
            <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
              Please select a session first
            </p>
          )}
        </div>

        <div className="control-group">
          <button
            onClick={fetchGalleryImages}
            className="refresh-btn"
            disabled={!selectedSessionId || loading}
          >
            🔄 Refresh Gallery
          </button>
        </div>

        {/* <div className="control-group">
          <button
            onClick={() => {
              console.log('=== DEBUG INFO ===');
              console.log('State - selectedSessionId:', selectedSessionId);
              console.log('Ref - selectedSessionIdRef.current:', selectedSessionIdRef.current);
              console.log('Sessions array:', sessions);
              console.log('User data:', user);
              console.log('Admin data:', getAdminData());
              alert(`Session ID (State): ${selectedSessionId}\nSession ID (Ref): ${selectedSessionIdRef.current}`);
            }}
            className="refresh-btn"
            style={{ backgroundColor: '#f39c12' }}
          >
            🐛 Debug Session State
          </button>
        </div> */}
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading...</p>
        </div>
      )}

      {!loading && selectedSessionId && (
        <div className="gallery-grid">
          {galleryImages.length === 0 ? (
            <div className="no-images">
              <p>No images found for this session.</p>
              <p>Upload your first image using the button above!</p>
            </div>
          ) : (
            galleryImages.map((image) => (
              <div key={image.id} className="gallery-card">
                <div className="image-container">
                  <img src={image.imageUrl} alt={image.title || 'Gallery image'} />
                </div>
                <div className="image-info">
                  {image.title && <h3 className="image-title">{image.title}</h3>}
                  {image.description ? (
                    <p className="image-description">{image.description}</p>
                  ) : (
                    <p className="image-description" style={{ fontStyle: 'italic', color: '#999' }}>
                      No description provided
                    </p>
                  )}
                  <div className="image-meta">
                    <span className="upload-date">
                       {
                        (() => {
                          try {
                            if (!image.createdAt) return 'Uploaded: Date unavailable';
                            // Handle format: 2025-10-21 01:40:31.233000
                            const dateStr = image.createdAt.toString();
                            const [datePart, timePart] = dateStr.split(' ');

                            return 'Uploaded On : ' + datePart;
                            
                            // if (!datePart) return 'Uploaded: Date unavailable';
                            
                            // // Parse date
                            // const date = new Date(datePart);
                            // if (isNaN(date.getTime())) return 'Uploaded: Date unavailable';
                            
                            // const formattedDate = date.toLocaleDateString('en-US', { 
                            //   year: 'numeric', 
                            //   month: 'short', 
                            //   day: 'numeric' 
                            // });
                            
                            // Parse time if available
                            // if (timePart) {
                            //   const timeOnly = timePart.split('.')[0]; // Remove microseconds
                            //   const [hours, minutes] = timeOnly.split(':');
                            //   const hour = parseInt(hours, 10);
                            //   const minute = minutes;
                            //   const ampm = hour >= 12 ? 'PM' : 'AM';
                            //   const displayHour = hour % 12 || 12;
                              
                            //   return `Uploaded: ${formattedDate} at ${displayHour}:${minute} ${ampm}`;
                            // }
                            
                            // return `Uploaded: ${formattedDate}`;
                          } catch (e) {
                            return 'Uploaded: Date unavailable';
                          }
                        })()
                      }
                    </span>
                  </div>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(image)}
                      className="edit-btn"
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="delete-btn"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!selectedSessionId && !loading && (
        <div className="no-session-selected">
          <p>Please select a session to view gallery images</p>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="modal-overlay" onClick={() => {
          setShowDescriptionModal(false);
          setPendingUploadResults([]);
          setImageDescription('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Image Description</h3>
            <p>Optionally add a description for your image to help students understand the context.</p>
            <textarea
              className="description-input"
              placeholder="Enter image description (optional)..."
              value={imageDescription}
              onChange={(e) => setImageDescription(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => {
                  setShowDescriptionModal(false);
                  setPendingUploadResults([]);
                  setImageDescription('');
                }}
              >
                ✕ Cancel
              </button>
              <button
                className="modal-btn modal-btn-skip"
                onClick={() => processUpload(pendingUploadResults, '')}
                disabled={loading}
              >
                ⏭️ Skip & Upload
              </button>
              <button
                className="modal-btn modal-btn-upload"
                onClick={() => processUpload(pendingUploadResults, imageDescription)}
                disabled={loading}
              >
                {loading ? '⏳ Uploading...' : '✓ Upload with Description'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingImage && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false);
          setEditingImage(null);
          setEditTitle('');
          setEditDescription('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Image Details</h3>
            <p>Update the title and description for this gallery image.</p>
            
            <div className="form-group">
              <label htmlFor="edit-title">Title</label>
              <input
                id="edit-title"
                type="text"
                className="description-input"
                style={{ minHeight: '45px', resize: 'none' }}
                placeholder="Enter image title..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-description">Description</label>
              <textarea
                id="edit-description"
                className="description-input"
                placeholder="Enter image description..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingImage(null);
                  setEditTitle('');
                  setEditDescription('');
                }}
              >
                ✕ Cancel
              </button>
              <button
                className="modal-btn modal-btn-upload"
                onClick={handleUpdateImage}
                disabled={loading}
              >
                {loading ? '⏳ Updating...' : '✓ Update Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryManagement;
