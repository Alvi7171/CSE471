const axios = require('axios');

const testSos = async () => {
    try {
        const response = await axios.post('http://localhost:1355/api/emergency', {
            patientId: 1,
            patientName: "Test Patient",
            patientPhone: "123456",
            patientAge: 25,
            patientGender: "Male",
            emergencyType: "Cardiac",
            severity: "High",
            status: "Reported",
            location: "Home",
            chiefComplaint: "Chest Pain"
        });
        console.log("SUCCESS:", response.data);
    } catch (error) {
        console.log("ERROR:", error.response ? error.response.data : error.message);
    }
};

testSos();
