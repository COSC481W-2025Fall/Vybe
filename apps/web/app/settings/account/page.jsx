'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, AlertTriangle, Trash2, Clock, Info, Download } from 'lucide-react';
import SettingsPageWrapper from '@/components/SettingsPageWrapper';
import { useProfile } from '@/hooks/useProfileUpdate';
import DeleteAccountModal from '@/components/DeleteAccountModal';

// Inner component that uses hooks
function AccountSettingsContent() {
  const { data: profileData, isLoading: loading } = useProfile();
  const [accountAge, setAccountAge] = useState(null);
  const [isAccountTooNew, setIsAccountTooNew] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Check account age (24 hour restriction)
  // Note: We'll get created_at from user metadata, profile data, or calculate from account creation
  useEffect(() => {
    // Try to get created_at from profile data first
    if (profileData?.created_at) {
      const createdAt = new Date(profileData.created_at);
      const now = new Date();
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
      setAccountAge(hoursSinceCreation);
      setIsAccountTooNew(hoursSinceCreation < 24);
    } else {
      // If created_at not in profile, we'll need to fetch it from auth.users or handle gracefully
      // For now, assume account is old enough (will be checked on server side too)
      setIsAccountTooNew(false);
    }
  }, [profileData]);

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (data) => {
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/user/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Show error message
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: {
              type: 'error',
              message: result.error || result.message || 'Failed to delete account',
            },
          }));
        }
        setIsDeleting(false);
        return;
      }

      // Success - show message and redirect
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            message: result.message || 'Account deleted successfully',
          },
        }));
        
        // Redirect to home after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            message: 'An error occurred while deleting your account',
          },
        }));
      }
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Account</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Account settings and data management
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 w-full">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 sm:px-6 py-4 w-full flex-shrink-0">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Account</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Account settings and data management
            </p>
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-4 sm:p-6 w-full space-y-6 sm:space-y-8">
        {/* Account Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Account Information</h3>
          
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-300 mb-3">
                  Manage your account settings, export your data, or permanently delete your account.
                </p>
                
                {/* Data Export */}
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-300 mb-1">
                        Export Your Data
                      </h4>
                      <p className="text-xs text-blue-200/80 mb-3">
                        Download all your account data in JSON format. This includes your profile, 
                        playlists, listening history, settings, and preferences. Recommended before 
                        deleting your account.
                      </p>
                      <p className="text-xs text-blue-200/60">
                        Rate limit: 1 export per 24 hours
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        setIsExporting(true);
                        try {
                          const response = await fetch('/api/user/export');
                          
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.error || 'Failed to export data');
                          }

                          // Get filename from Content-Disposition header or use default
                          const contentDisposition = response.headers.get('Content-Disposition');
                          const filename = contentDisposition
                            ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
                            : `vybe-data-export-${new Date().toISOString().split('T')[0]}.json`;

                          // Download file
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);

                          // Show success message
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('show-toast', {
                              detail: {
                                type: 'success',
                                message: 'Data export downloaded successfully!',
                              },
                            }));
                          }
                        } catch (error) {
                          console.error('Failed to export data:', error);
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('show-toast', {
                              detail: {
                                type: 'error',
                                message: error.message || 'Failed to export data',
                              },
                            }));
                          }
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      disabled={isExporting}
                      className={[
                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black',
                        isExporting
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95',
                      ].join(' ')}
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Export Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-medium text-white">Danger Zone</h3>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-red-300 mb-2">
                    Delete Your Account
                  </h4>
                  <p className="text-sm text-gray-300 mb-4">
                    This action cannot be undone. Deleting your account will permanently remove:
                  </p>
                  
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 mb-4 ml-4">
                    <li>Your profile and all associated data</li>
                    <li>All playlists you&apos;ve created</li>
                    <li>Your listening history and activity</li>
                    <li>All social connections and friendships</li>
                    <li>Group playlists and collaborations</li>
                    <li>Your notification preferences and privacy settings</li>
                  </ul>

                  {isAccountTooNew && accountAge !== null && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-300 mb-1">
                            Account Protection Period
                          </p>
                          <p className="text-xs text-yellow-200/80">
                            For security purposes, accounts less than 24 hours old cannot be deleted. 
                            Your account was created {Math.floor(accountAge)} hours ago. 
                            You&apos;ll be able to delete your account in {Math.ceil(24 - accountAge)} hour(s).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isAccountTooNew && (
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-300 mb-1">
                            Account Deletion Process
                          </p>
                          <p className="text-xs text-blue-200/80">
                            Account deletion is permanent and irreversible. You&apos;ll be asked to confirm 
                            your decision through a multi-step process, including typing a confirmation phrase 
                            and re-entering your password.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDeleteClick}
                    disabled={isAccountTooNew}
                    className={[
                      'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black',
                      isAccountTooNew
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-lg hover:shadow-red-500/20 active:scale-95',
                    ].join(' ')}
                  >
                    <Trash2 className="h-5 w-5" />
                    {isAccountTooNew ? 'Account Too New to Delete' : 'Delete My Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// Outer component that wraps content with SettingsPageWrapper
export default function AccountSettingsPage() {
  return (
    <SettingsPageWrapper>
      <AccountSettingsContent />
    </SettingsPageWrapper>
  );
}

