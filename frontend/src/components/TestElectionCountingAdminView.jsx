// import { useEffect } from 'react';
// import { CountingSection } from '../pages/Admin';
// import api from '../services/api';

// export const TestElectionCountingAdminView = ({
//   theme,
//   elections,
//   setElections,
//   loadingElections,
//   setLoadingElections,
//   countingElectionId,
//   setCountingElectionId,
//   countingError,
//   setCountingError,
// }) => {

//   /**
//    * Load all elections from API
//    */
//   const loadElections = async () => {
//     setLoadingElections(true);
//     setCountingError('');

//     try {
//       const response = await api.get('/admin/elections?startedOnly=true&endedOnly=true');
//       setElections(response.data || []);
//     } catch (error) {
//       setCountingError(`Fehler beim Laden der Wahlen: ${error.message}`);
//     } finally {
//       setLoadingElections(false);
//     }
//   };

//   // Load elections on mount
//   useEffect(() => {
//     loadElections();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   /**
//    * Perform counting for an election
//    *
//    * @param {string} electionId - UUID of election to count
//    */
//   const handleCount = async (electionId) => {
//     setCountingElectionId(electionId);
//     setCountingError('');

//     // Clear previous result/error for this election
//     setElections((prev) =>
//       prev.map((e) =>
//         e.id === electionId ? { ...e, countingResult: null, countingError: null } : e,
//       ),
//     );

//     try {
//       const response = await api.post(`/counting/${electionId}/count`);

//       if (response.data.success) {
//         const countResult = response.data.data;

//         // Load full results
//         const resultsResponse = await api.get(`/counting/${electionId}/results`);
//         if (resultsResponse.data.success) {
//           const fullResult = {
//             ...countResult,
//             fullResults: resultsResponse.data.data,
//           };

//           // Update election with result
//           setElections((prev) =>
//             prev.map((e) =>
//               e.id === electionId ? { ...e, countingResult: fullResult, countingError: null } : e,
//             ),
//           );
//         }
//       } else {
//         // Store error in election object
//         setElections((prev) =>
//           prev.map((e) =>
//             e.id === electionId
//               ? { ...e, countingError: response.data.message || 'Auszählung fehlgeschlagen' }
//               : e,
//           ),
//         );
//       }
//     } catch (error) {
//       // Store error in election object
//       const errorMessage = error.response?.data?.message || error.message || 'Unbekannter Fehler';
//       setElections((prev) =>
//         prev.map((e) => (e.id === electionId ? { ...e, countingError: errorMessage } : e)),
//       );
//     } finally {
//       setCountingElectionId(null);
//     }
//   };

//   /**
//    * Export election result as Excel file
//    *
//    * @param {string} resultId - UUID of the election result
//    */
//   const handleExportResult = async (resultId) => {
//     try {
//       const blob = await exportElectionResultExcel(resultId);

//       // Create download link
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;

//       // Generate filename with timestamp
//       const timestamp = new Date().toISOString().split('T')[0];
//       link.download = `Wahlergebnis_${resultId.substring(0, 8)}_${timestamp}.xlsx`;

//       // Trigger download
//       document.body.appendChild(link);
//       link.click();

//       // Cleanup
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       setCountingError(`Failed to export election result: ${error.message}`);
//     }
//   };

//   /**
//    * Format date to German locale
//    *
//    * @param {string} dateString - ISO date string
//    * @returns {string} Formatted date
//    */
//   const formatDate = (dateString) => {
//     if (!dateString) {
//       return '';
//     }
//     return new Date(dateString).toLocaleString('de-DE', {
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit',
//       hour: '2-digit',
//       minute: '2-digit',
//     });
//   };

//   return (
//     <div>
//       <CountingSection
//         theme={theme}
//         elections={elections}
//         setElections={setElections}
//         loadingElections={loadingElections}
//         setLoadingElections={setLoadingElections}
//         countingElectionId={countingElectionId}
//         setCountingElectionId={setCountingElectionId}
//         countingResult={countingResult}
//         setCountingResult={setCountingResult}
//         countingError={countingError}
//         setCountingError={setCountingError}
//       />
//     </div>
//   );
// };
