  import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StripeCheckout from '../components/Payments/StripeCheckout';
import { bookingsService, authService } from '../services/firebaseService';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Payments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser } = useAuth();
  const { bookingId: stateBookingId, amount: stateAmount } = location.state || {};

  const handleSuccess = async (paymentIntent) => {
    console.log('💳 Payment succeeded:', paymentIntent);
    console.log('📋 Payment Intent ID:', paymentIntent?.id);
    console.log('📋 Payment Status:', paymentIntent?.status);

    // Import auth once at the start
    const { auth: firebaseAuth } = await import('../config/firebase');

    try {
      const bookingId = stateBookingId || paymentIntent?.bookingId || paymentIntent?.metadata?.bookingId;
      const guestData = location.state?.guestData;
      const roomId = location.state?.roomId;
      const amount = stateAmount || paymentIntent?.amount ? (paymentIntent.amount / 100) : 0;
      
      console.log('📦 Booking ID:', bookingId);
      console.log('👤 Guest Data available:', !!guestData);
      console.log('🏠 Room ID:', roomId);
      console.log('🔐 User authenticated:', isAuthenticated);

      if (!bookingId) {
        console.warn('⚠️ No booking ID found, payment recorded but booking not updated');
        toast.success('Payment recorded');
        return;
      }

      // STEP 1: Create Firebase Auth user FIRST if not authenticated
      // Use guestData from location.state (passed from ClientBooking.jsx)
      let userId = null;
      if (!isAuthenticated && guestData) {
        try {
          console.log('🔐 User not authenticated, creating Firebase Auth account...');
          console.log('📝 Guest data:', { 
            email: guestData.email, 
            firstName: guestData.firstName, 
            lastName: guestData.lastName 
          });

          // Create Firebase Auth user with guest data
          const registrationResult = await authService.register({
            email: guestData.email,
            password: guestData.password || `Temp${Date.now()}!`, // Use provided password or generate one
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            phone: guestData.phone || '',
            address: guestData.address || '',
            role: 'client'
          });

          userId = registrationResult.user.id;
          console.log('✅ User account created successfully');
          console.log('👤 User ID:', userId);
          console.log('🔑 Auth token obtained');

          // Wait for auth state to propagate to React context
          // The AuthContext will update automatically via onAuthStateChanged
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify auth.currentUser is set
          if (firebaseAuth.currentUser) {
            console.log('✅ Auth state verified, current user:', firebaseAuth.currentUser.uid);
            // Refresh user in AuthContext to ensure it's updated
            try {
              await refreshUser();
              console.log('✅ AuthContext refreshed with new user');
            } catch (refreshError) {
              console.warn('⚠️ Failed to refresh AuthContext:', refreshError);
            }
          } else {
            console.warn('⚠️ Auth state not immediately available, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Try to refresh again
            try {
              await refreshUser();
            } catch (refreshError) {
              console.warn('⚠️ Failed to refresh AuthContext after wait:', refreshError);
            }
          }

          // Link guest to user by updating the guest document with userId
          // First, we need to find the guest document by email
          try {
            console.log('🔗 Linking guest to user account...');
            const { collection, query, where, getDocs, updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            const guestsRef = collection(db, 'guests');
            const guestQuery = query(guestsRef, where('email', '==', guestData.email));
            const guestSnapshot = await getDocs(guestQuery);
            
            if (!guestSnapshot.empty) {
              const guestDoc = guestSnapshot.docs[0];
              await updateDoc(firestoreDoc(db, 'guests', guestDoc.id), {
                userId: userId,
                updatedAt: (await import('firebase/firestore')).serverTimestamp()
              });
              console.log('✅ Guest linked to user account');
            } else {
              console.warn('⚠️ Guest document not found for email:', guestData.email);
            }
          } catch (linkError) {
            console.warn('⚠️ Failed to link guest to user:', linkError);
            // Non-critical - continue with booking update
          }

          toast.success('Account created! You can now view your bookings.');
        } catch (authError) {
          console.error('❌ Failed to create user account:', authError);
          console.error('❌ Auth error details:', {
            code: authError.code,
            message: authError.message,
            stack: authError.stack
          });
          
          // If user already exists, try to sign in
          if (authError.code === 'auth/email-already-in-use' && guestData.email && guestData.password) {
            console.log('🔄 User already exists, attempting to sign in...');
            try {
              const loginResult = await authService.login({
                email: guestData.email,
                password: guestData.password
              });
              userId = loginResult.user.id;
              console.log('✅ Signed in with existing account');
              // Refresh user in AuthContext
              await refreshUser();
            } catch (loginError) {
              console.error('❌ Failed to sign in with existing account:', loginError);
              toast.error('Account exists but could not sign in. Please sign in manually.');
            }
          } else {
            toast.error('Could not create account. Please contact support.');
            // Continue with booking update even if account creation fails
            // The booking will be updated, but user won't be able to view it without account
          }
        }
      } else if (!isAuthenticated && !guestData) {
        console.warn('⚠️ No guest data available and user not authenticated');
        toast.error('Unable to create account: missing guest information');
      } else if (isAuthenticated) {
        // Get current user ID
        userId = firebaseAuth.currentUser?.uid || null;
        console.log('✅ User already authenticated, user ID:', userId);
      }

      // STEP 2: Wait for authentication state to be available
      console.log('⏳ Ensuring authentication state is available...');
      
      // Wait up to 3 seconds for auth state
      let authWaitCount = 0;
      while (!firebaseAuth.currentUser && authWaitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        authWaitCount++;
      }

      if (firebaseAuth.currentUser) {
        console.log('✅ Auth state available, user ID:', firebaseAuth.currentUser.uid);
      } else {
        console.warn('⚠️ Auth state not available after waiting');
        // Continue anyway - Firestore rules might allow updates during payment flow
      }

      // STEP 3: We have bookingId and roomId from location.state
      // We don't need to fetch the booking - we'll update it directly with userId
      // The booking might not be readable yet (if it doesn't have userId), but we can still update it
      console.log('📝 Will update booking directly with userId and payment status');
      console.log('ℹ️ Booking ID:', bookingId);
      console.log('ℹ️ Room ID:', roomId);

      // STEP 4: Record payment in Firestore (if paymentIntent.id exists)
      if (paymentIntent?.id) {
        console.log('💾 Recording payment in Firestore...');
        try {
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('../config/firebase');
          const paymentRef = doc(db, 'payments', paymentIntent.id);
          await setDoc(paymentRef, {
            id: paymentIntent.id,
            bookingId,
            amount: amount || (paymentIntent.amount ? paymentIntent.amount / 100 : 0), // Convert from cents if needed
            currency: paymentIntent.currency || 'usd',
            status: 'completed',
            paymentMethod: 'card',
            paymentIntentId: paymentIntent.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          console.log('✅ Payment recorded in Firestore');
        } catch (paymentRecordError) {
          console.error('❌ Failed to record payment:', paymentRecordError);
          // Non-critical - payment already succeeded in Stripe
        }
      }

      // STEP 5: Update booking status to confirmed and paid
      // Also link booking to user if userId is available
      console.log('📝 Updating booking status to confirmed and paid...');
      const bookingUpdateData = { 
        status: 'confirmed', 
        paymentStatus: 'paid',
        paymentIntentId: paymentIntent?.id || null
      };
      
      // Link booking to user if we have a userId
      if (userId) {
        bookingUpdateData.userId = userId;
        console.log('🔗 Linking booking to user:', userId);
      }
      
      try {
        const updateResult = await bookingsService.update(bookingId, bookingUpdateData);
        console.log('✅ Booking status updated successfully');
        console.log('📋 Update result:', updateResult);
        
        // Wait a moment for the update to propagate before querying
        // This helps ensure the booking is readable immediately after update
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('⏳ Waited for booking update to propagate');
        
        // Try to verify the update worked by reading the booking
        try {
          const verifyBooking = await bookingsService.getById(bookingId);
          console.log('✅ Booking verified after update:', {
            id: verifyBooking.data?.id,
            userId: verifyBooking.data?.userId,
            status: verifyBooking.data?.status,
            paymentStatus: verifyBooking.data?.paymentStatus
          });
        } catch (verifyError) {
          console.warn('⚠️ Could not verify booking after update (might be timing issue):', verifyError.message);
        }
      } catch (updateError) {
        console.error('❌ Failed to update booking status:', updateError);
        console.error('❌ Update error details:', {
          code: updateError.code,
          message: updateError.message,
          bookingId
        });
        
        // Retry once
        console.log('🔄 Retrying booking update...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await bookingsService.update(bookingId, bookingUpdateData);
          console.log('✅ Booking status updated on retry');
        } catch (retryError) {
          console.error('❌ Failed to update booking on retry:', retryError);
          toast.error('Payment succeeded but booking update failed. Please contact support.');
        }
      }

      // STEP 6: Update room status to occupied (admin-only operation)
      // Note: Room updates require admin privileges, so this will fail for regular users
      // This is expected and acceptable - only admins should update room status
      // We'll skip this for non-admin users to avoid error noise
      const actualRoomId = roomId;
      if (actualRoomId) {
        // Only attempt room update if user is admin (optional - can be handled by admin manually)
        // For now, we'll skip it silently for regular users
        console.log('ℹ️ Room status update skipped (requires admin privileges - can be updated manually)');
        console.log('ℹ️ Room ID:', actualRoomId);
      } else {
        console.warn('⚠️ No roomId found, skipping room status update');
      }

      console.log('✅ Payment post-processing complete');
      toast.success('Payment successful and booking confirmed!');
      
      // STEP 7: Wait for auth state to fully propagate before redirecting
      // Give AuthContext time to update with the new user
      console.log('⏳ Waiting for auth state to propagate before redirect...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify auth state one more time
      if (firebaseAuth.currentUser) {
        console.log('✅ Auth state confirmed, redirecting to dashboard');
        navigate('/dashboard');
      } else {
        console.warn('⚠️ Auth state not available, redirecting anyway (AuthContext will handle it)');
        navigate('/dashboard');
      }
      
    } catch (err) {
      console.error('❌ Critical error in post-payment processing:', err);
      console.error('❌ Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        bookingId: stateBookingId || paymentIntent?.bookingId,
        paymentIntentId: paymentIntent?.id
      });
      toast.error('Payment succeeded but post-processing encountered an error. Please contact support with your payment ID.');
    }
  };

// ===== Stripe Checkout (Disabled) Code Commented Out =====
/*
  const handleCheckout = async () => {
    // NOTE: Stripe checkout sessions require a backend server for security
    // The secret key cannot be exposed in client-side code.
    // To implement Stripe payments in a Firebase-only app, you have two options:
    // 1. Use Firebase Functions (Cloud Functions) to create checkout sessions
    // 2. Use Stripe Checkout redirect mode with Firebase Functions as webhook handler
    //
    // Example Firebase Function endpoint would be:
    // https://your-region-your-project.cloudfunctions.net/createCheckoutSession
    toast.error('Payment processing requires Firebase Functions. Please set up a Cloud Function for Stripe integration.');
    console.warn('Stripe integration requires backend - implement via Firebase Functions');

    // Uncomment and modify when Firebase Function is set up:
    try {
      const res = await fetch('https://your-region-your-project.cloudfunctions.net/createCheckoutSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10.00, currency: 'USD', booking_id: 1 })
      });
      const data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Error creating checkout session', e);
    }
  };
*/

  const bookingId = stateBookingId || null;
  const amount = stateAmount || 10.00;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
      <p className="mt-1 text-sm text-gray-500">Make a payment for a booking</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <StripeCheckout bookingId={bookingId} amount={amount} currency="USD" onSuccess={handleSuccess} />
          {/* ===== Stripe Checkout (Disabled) Button Commented Out ===== */}
          {/*
          <div className="mt-4">
            <button onClick={handleCheckout} className="px-4 py-2 bg-green-600 text-white rounded">Pay with Stripe Checkout</button>
          </div>
          */}
        </div>
      </div>
    </div>
  );
};

export default Payments;
