  #define ENABLE_USER_AUTH

  #define ENABLE_FIRESTORE

  #define ENABLE_FIRESTORE_QUERY



  #include <SPI.h>

  #include <MFRC522.h>

  #include <WiFi.h>

  #include <WiFiClientSecure.h>

  #include <Wire.h>

  #include <LiquidCrystal_I2C.h>

  #include <FirebaseClient.h>

  #include <time.h>
#include <Preferences.h>



  // ================= RFID =================



  #define SS_PIN 5

  #define RST_PIN 27



  MFRC522 rfid(SS_PIN, RST_PIN);



  // ================= LCD =================



  #define LCD_ADDRESS 0x27

  #define LCD_COLUMNS 16

  #define LCD_ROWS 2



  LiquidCrystal_I2C lcd(

    LCD_ADDRESS,

    LCD_COLUMNS,

    LCD_ROWS

  );



  // ================= LED =================



  #define RED_LED_PIN 25

  #define GREEN_LED_PIN 26



  // ================= WIFI =================



  #define WIFI_SSID     "moto g64 5G_9474"

  #define WIFI_PASSWORD "12377458"



  // =====================================================

  // Firebase

  // =====================================================



  #define API_KEY             "AIzaSyAHAW89cBA-8ZC7jG1y11ryADjDTjZGwNE"

  #define USER_EMAIL          "devanshupatil003@gmail.com"

  #define USER_PASSWORD       "Devanshu@123"

  #define FIREBASE_PROJECT_ID "attendix-rfid-attendance"



  // ================= FIREBASE OBJECTS =================



  #define SSL_CLIENT WiFiClientSecure



  SSL_CLIENT sslClient;



  using AsyncClient = AsyncClientClass;



  AsyncClient aClient(sslClient);



  UserAuth user_auth(

    API_KEY,

    USER_EMAIL,

    USER_PASSWORD,

    3000

  );



  FirebaseApp app;

  Firestore::Documents Docs;



  bool firebaseReady = false;

  bool cardProcessing = false;



  // ================= REGISTRATION =================



  bool registrationPending = false;

  bool registrationQueryRunning = false;



  String registrationRequestId = "";

  String registrationStudentId = "";



  unsigned long lastRegistrationCheck = 0;

  const unsigned long REGISTRATION_CHECK_INTERVAL = 60000;

  // Pending registration requests expire after 5 minutes so stale requests
  // cannot unexpectedly put a new card into registration mode.
  unsigned long registrationArmedAt = 0;
  const unsigned long REGISTRATION_ARM_TIMEOUT = 5UL * 60UL * 1000UL;



  bool registrationCompletionRunning = false;



  // ================= STUDENT DATA =================



  String currentStudentId = "";

  String currentStudentName = "";

  String currentStudentRollNo = "";

  String currentStudentDepartment = "";

  String currentStudentClass = "";

  String currentRFID = "";

// ================= TIMETABLE / DAILY ATTENDANCE STATE =================

String activeSubjectID = "";
String activeSubjectName = "";
String activeSubjectCode = "";
String activeTeacherUid = "";
String activeTimetableID = "";
String activeRoom = "";
String activeType = "";

const int ATTENDANCE_START_MINUTES = 9 * 60;
const int ATTENDANCE_END_MINUTES = 15 * 60 + 50;

bool attendanceCreateRunning = false;
String attendanceDocumentId = "";


// ================= LOCAL RFID STUDENT CACHE =================
// Student identification is done from ESP32 NVS memory.
// Firestore is NOT queried on every RFID scan and is NOT required at startup.

struct StudentCacheEntry
{
  String id;
  String rfid;
  String name;
  String rollNo;
  String department;
  String studentClass;
  bool active;
};

const int MAX_STUDENTS = 100;
StudentCacheEntry studentCache[MAX_STUDENTS];
int studentCacheCount = 0;
bool studentCacheLoaded = false;

Preferences studentPrefs;
const char *STUDENT_PREF_NAMESPACE = "attendix";

String prefKey(const char *prefix, int index)
{
  return String(prefix) + String(index);
}

void saveStudentCacheToNVS()
{
  studentPrefs.begin(STUDENT_PREF_NAMESPACE, false);
  studentPrefs.clear();
  studentPrefs.putInt("count", studentCacheCount);

  for (int i = 0; i < studentCacheCount; i++)
  {
    studentPrefs.putString(prefKey("uid", i).c_str(), studentCache[i].rfid);
    studentPrefs.putString(prefKey("sid", i).c_str(), studentCache[i].id);
    studentPrefs.putString(prefKey("nam", i).c_str(), studentCache[i].name);
    studentPrefs.putString(prefKey("rol", i).c_str(), studentCache[i].rollNo);
    studentPrefs.putString(prefKey("dep", i).c_str(), studentCache[i].department);
    studentPrefs.putString(prefKey("cls", i).c_str(), studentCache[i].studentClass);
    studentPrefs.putBool(prefKey("act", i).c_str(), studentCache[i].active);
  }

  studentPrefs.end();

  Serial.println("Student RFID cache saved to ESP32 NVS.");
}

void seedKnownStudentsIfEmpty()
{
  if (studentCacheCount != 0) return;

  // These are the RFID-registered students already present in your database.
  // More students are added automatically when their RFID is registered.
  struct SeedStudent {
    const char *id;
    const char *rfid;
    const char *name;
    const char *roll;
  };

  const SeedStudent seeds[] = {
    {"3PABJCzF9fYOwtkL8iQH", "E1 D2 FA AD", "Soham Hole", "08"},
    {"QXxqwM0HdDvXsVunnhVC", "C1 E4 B5 AD", "Sagar Pawar", "05"},
    {"j8rsQkQUcw3Y350zmYcn", "21 50 AA AD", "Kabir Jagtap", "01"},
    {"k4Rna7MrJ73XE1pVg3G1", "8B BD D7 06", "Karan Shewate", "07"}
  };

  const int seedCount = sizeof(seeds) / sizeof(seeds[0]);

  for (int i = 0; i < seedCount && studentCacheCount < MAX_STUDENTS; i++)
  {
    StudentCacheEntry &entry = studentCache[studentCacheCount++];
    entry.id = seeds[i].id;
    entry.rfid = seeds[i].rfid;
    entry.rfid.toUpperCase();
    entry.name = seeds[i].name;
    entry.rollNo = seeds[i].roll;
    entry.department = "AI and Data Science";
    entry.studentClass = "Third Year";
    entry.active = true;
  }

  saveStudentCacheToNVS();
  Serial.println("Seeded known RFID cards into local cache.");
}

void loadStudentCacheFromNVS()
{
  studentPrefs.begin(STUDENT_PREF_NAMESPACE, true);

  int savedCount = studentPrefs.getInt("count", 0);
  studentCacheCount = 0;

  if (savedCount > 0)
  {
    savedCount = min(savedCount, MAX_STUDENTS);

    for (int i = 0; i < savedCount; i++)
    {
      String uid = studentPrefs.getString(prefKey("uid", i).c_str(), "");
      uid.trim();
      uid.toUpperCase();

      if (uid == "") continue;

      StudentCacheEntry &entry = studentCache[studentCacheCount++];
      entry.rfid = uid;
      entry.id = studentPrefs.getString(prefKey("sid", i).c_str(), "");
      entry.name = studentPrefs.getString(prefKey("nam", i).c_str(), "Unknown Student");
      entry.rollNo = studentPrefs.getString(prefKey("rol", i).c_str(), "");
      entry.department = studentPrefs.getString(prefKey("dep", i).c_str(), "AI and Data Science");
      entry.studentClass = studentPrefs.getString(prefKey("cls", i).c_str(), "Third Year");
      entry.active = studentPrefs.getBool(prefKey("act", i).c_str(), true);
    }
  }

  studentPrefs.end();

  if (studentCacheCount == 0)
  {
    seedKnownStudentsIfEmpty();
  }

  studentCacheLoaded = true;

  Serial.println();
  Serial.println("========== LOCAL RFID CACHE ==========");
  Serial.println("Students stored locally: " + String(studentCacheCount));
  Serial.println("Firestore student search: DISABLED");
  Serial.println("======================================");
}

StudentCacheEntry* findStudentInCache(String uid)
{
  uid.trim();
  uid.toUpperCase();

  for (int i = 0; i < studentCacheCount; i++)
  {
    if (studentCache[i].rfid == uid)
    {
      return &studentCache[i];
    }
  }

  return nullptr;
}

void updateStudentCacheAfterRegistration(String studentId, String uid)
{
  uid.trim();
  uid.toUpperCase();

  for (int i = 0; i < studentCacheCount; i++)
  {
    if (studentCache[i].id == studentId)
    {
      studentCache[i].rfid = uid;
      saveStudentCacheToNVS();
      Serial.println("Local RFID cache updated and saved.");
      return;
    }
  }

  if (studentCacheCount >= MAX_STUDENTS)
  {
    Serial.println("ERROR: Local student cache is full.");
    return;
  }

  // The registration request gives us the student document ID and new UID.
  // Keep the new card locally immediately. Metadata can be filled by the admin
  // later; attendance lookup only needs the RFID-to-student mapping.
  StudentCacheEntry &entry = studentCache[studentCacheCount++];
  entry.id = studentId;
  entry.rfid = uid;
  entry.name = "Registered Student";
  entry.rollNo = "";
  entry.department = "AI and Data Science";
  entry.studentClass = "Third Year";
  entry.active = true;

  saveStudentCacheToNVS();
  Serial.println("New RFID added to local ESP32 cache.");
}

// ================= LCD FUNCTIONS =================



  void showLCD(String line1, String line2)

  {

    lcd.clear();



    lcd.setCursor(0, 0);

    lcd.print(line1.substring(0, LCD_COLUMNS));



    lcd.setCursor(0, 1);

    lcd.print(line2.substring(0, LCD_COLUMNS));

  }



  void showReadyScreen()

  {

    LEDsOff();



    showLCD(

      "ATTENDIX READY",

      "TAP YOUR CARD"

    );

  }



  // ================= LED FUNCTIONS =================



  void initializeLEDs()

  {

    pinMode(RED_LED_PIN, OUTPUT);

    pinMode(GREEN_LED_PIN, OUTPUT);



    LEDsOff();

  }



  void redLED()

  {

    digitalWrite(RED_LED_PIN, HIGH);

    digitalWrite(GREEN_LED_PIN, LOW);

  }



  void greenLED()

  {

    digitalWrite(RED_LED_PIN, LOW);

    digitalWrite(GREEN_LED_PIN, HIGH);

  }



  void LEDsOff()

  {

    digitalWrite(RED_LED_PIN, LOW);

    digitalWrite(GREEN_LED_PIN, LOW);

  }



  // ================= FIREBASE DEBUG =================



  void authDebugPrint(AsyncResult &aResult)

  {

    if (aResult.isEvent())

    {

      Firebase.printf(

        "Event: %s | %s | Code: %d\n",

        aResult.uid().c_str(),

        aResult.eventLog().message().c_str(),

        aResult.eventLog().code()

      );

    }



    if (aResult.isDebug())

    {

      Firebase.printf(

        "Debug: %s | %s\n",

        aResult.uid().c_str(),

        aResult.debug().c_str()

      );

    }



    if (aResult.isError())

    {

      Firebase.printf(

        "Error: %s | %s | Code: %d\n",

        aResult.uid().c_str(),

        aResult.error().message().c_str(),

        aResult.error().code()

      );

    }

  }



  // ================= RFID =================



  String readRFID()

  {

    String uid = "";



    for (byte i = 0; i < rfid.uid.size; i++)

    {

      if (rfid.uid.uidByte[i] < 0x10)

      {

        uid += "0";

      }



      uid += String(

        rfid.uid.uidByte[i],

        HEX

      );



      if (i < rfid.uid.size - 1)

      {

        uid += " ";

      }

    }



    uid.toUpperCase();



    return uid;

  }



  // ================= DATE =================



  String getDate()

  {

    struct tm timeinfo;



    if (!getLocalTime(&timeinfo))

    {

      return "0000-00-00";

    }



    char buffer[11];



    strftime(

      buffer,

      sizeof(buffer),

      "%Y-%m-%d",

      &timeinfo

    );



    return String(buffer);

  }



  // ================= TIME =================



  String getTime()

  {

    struct tm timeinfo;



    if (!getLocalTime(&timeinfo))

    {

      return "00:00:00";

    }



    char buffer[9];



    strftime(

      buffer,

      sizeof(buffer),

      "%H:%M:%S",

      &timeinfo

    );



    return String(buffer);

  }



  // ================= DAY =================



  String getDay()

  {

    struct tm timeinfo;



    if (!getLocalTime(&timeinfo))

    {

      return "";

    }



    char buffer[15];



    strftime(

      buffer,

      sizeof(buffer),

      "%A",

      &timeinfo

    );



    return String(buffer);

  }



  // ================= CURRENT MINUTES =================



  int getCurrentMinutes()

  {

    struct tm timeinfo;



    if (!getLocalTime(&timeinfo))

    {

      return -1;

    }



    return timeinfo.tm_hour * 60 + timeinfo.tm_min;

  }



  // ================= CONVERT TIME =================



  int convertTimeToMinutes(String timeText)

  {

    timeText.trim();

    timeText.toUpperCase();



    if (timeText.length() == 0)

    {

      return -1;

    }



    int colonPosition = timeText.indexOf(':');



    if (colonPosition == -1)

    {

      return -1;

    }



    int hour = timeText.substring(0, colonPosition).toInt();



    String minutePart = timeText.substring(colonPosition + 1);

    minutePart.trim();



    bool isPM = minutePart.indexOf("PM") != -1;

    bool isAM = minutePart.indexOf("AM") != -1;



    minutePart.replace("AM", "");

    minutePart.replace("PM", "");

    minutePart.trim();



    int minute = minutePart.toInt();



    // 24-hour format: 09:00, 16:30, etc.

    if (!isAM && !isPM)

    {

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59)

      {

        return -1;

      }



      return hour * 60 + minute;

    }



    // 12-hour format: 09:00 AM / 04:00 PM

    if (isAM && hour == 12)

    {

      hour = 0;

    }



    if (isPM && hour != 12)

    {

      hour += 12;

    }



    if (hour < 0 || hour > 23 || minute < 0 || minute > 59)

    {

      return -1;

    }



    return hour * 60 + minute;

  }



  // ================= EXTRACT STRING =================



  String extractStringField(String source, String fieldName)

  {

    // Firestore responses contain a document-level "name" field before

    // the actual fields map. Always search inside the "fields" object.

    int fieldsPosition = source.indexOf("\"fields\"");

    int searchStart = (fieldsPosition >= 0) ? fieldsPosition : 0;



    String fieldMarker = "\"" + fieldName + "\"";

    int fieldPosition = source.indexOf(fieldMarker, searchStart);



    if (fieldPosition == -1)

    {

      Serial.println("Field not found: " + fieldName);

      return "";

    }



    // Make sure the field marker is followed by its own value object.

    int colonPosition = source.indexOf(':', fieldPosition + fieldMarker.length());

    if (colonPosition == -1)

    {

      Serial.println("Field colon not found: " + fieldName);

      return "";

    }



    int objectStart = source.indexOf('{', colonPosition + 1);

    if (objectStart == -1)

    {

      Serial.println("Field object not found: " + fieldName);

      return "";

    }



    // Firestore field objects used here are flat:

    // "field": { "stringValue": "value" }

    int objectEnd = source.indexOf('}', objectStart);

    if (objectEnd == -1)

    {

      Serial.println("Field object end not found: " + fieldName);

      return "";

    }



    String fieldObject = source.substring(objectStart, objectEnd + 1);

    int valueMarker = fieldObject.indexOf("\"stringValue\"");



    if (valueMarker == -1)

    {

      Serial.println("stringValue not found: " + fieldName);

      return "";

    }



    int valueColon = fieldObject.indexOf(':', valueMarker);

    if (valueColon == -1)

    {

      return "";

    }



    int valueStart = fieldObject.indexOf('"', valueColon + 1);

    if (valueStart == -1)

    {

      return "";

    }

    valueStart++;



    int valueEnd = fieldObject.indexOf('"', valueStart);

    if (valueEnd == -1)

    {

      return "";

    }



    String result = fieldObject.substring(valueStart, valueEnd);

    result.trim();

    return result;

  }



  // ================= EXTRACT BOOLEAN =================



  bool extractBooleanField(String source, String fieldName)

  {

    int fieldsPosition = source.indexOf("\"fields\"");

    int searchStart = (fieldsPosition >= 0) ? fieldsPosition : 0;



    String fieldMarker = "\"" + fieldName + "\"";

    int fieldPosition = source.indexOf(fieldMarker, searchStart);



    if (fieldPosition == -1)

    {

      Serial.println("Boolean field not found: " + fieldName);

      return false;

    }



    int colonPosition = source.indexOf(':', fieldPosition + fieldMarker.length());

    if (colonPosition == -1)

    {

      return false;

    }



    int objectStart = source.indexOf('{', colonPosition + 1);

    if (objectStart == -1)

    {

      return false;

    }



    int objectEnd = source.indexOf('}', objectStart);

    if (objectEnd == -1)

    {

      return false;

    }



    String fieldObject = source.substring(objectStart, objectEnd + 1);

    int booleanMarker = fieldObject.indexOf("\"booleanValue\"");



    if (booleanMarker == -1)

    {

      return false;

    }



    int booleanColon = fieldObject.indexOf(':', booleanMarker);

    if (booleanColon == -1)

    {

      return false;

    }



    String booleanValue = fieldObject.substring(booleanColon + 1);

    booleanValue.trim();

    return booleanValue.startsWith("true");

  }



  // ================= FLEXIBLE STUDENT FIELD HELPERS =================



  String extractFirstStringField(

    String source,

    String field1,

    String field2,

    String field3

  )

  {

    String value = "";



    if (field1 != "")

    {

      value = extractStringField(source, field1);

      if (value != "") return value;

    }



    if (field2 != "")

    {

      value = extractStringField(source, field2);

      if (value != "") return value;

    }



    if (field3 != "")

    {

      value = extractStringField(source, field3);

      if (value != "") return value;

    }



    return "";

  }



  bool extractStudentActive(String source)

  {

    // Preferred format: active: true/false

    String activeMarker = "\"active\"";

    int activePosition = source.indexOf(activeMarker);



    if (activePosition != -1)

    {

      int truePosition =

        source.indexOf("\"booleanValue\":true", activePosition);



      int falsePosition =

        source.indexOf("\"booleanValue\":false", activePosition);



      if (

        truePosition != -1 &&

        (falsePosition == -1 || truePosition < falsePosition)

      )

      {

        return true;

      }



      if (

        falsePosition != -1 &&

        (truePosition == -1 || falsePosition < truePosition)

      )

      {

        return false;

      }

    }



    // Dashboard format: status: "ACTIVE"

    String status =

      extractFirstStringField(

        source,

        "status",

        "studentStatus",

        ""

      );



    status.trim();

    status.toUpperCase();



    if (status == "ACTIVE" || status == "PRESENT")

    {

      return true;

    }



    if (

      status == "INACTIVE" ||

      status == "DISABLED" ||

      status == "BLOCKED"

    )

    {

      return false;

    }



    // Older student documents may not have either field.

    // Treat an RFID-registered student as active rather than

    // incorrectly showing STUDENT INACTIVE.

    Serial.println(

      "No active/status field found; treating registered student as ACTIVE."

    );



    return true;

  }



  // ================= EXTRACT DOCUMENT ID =================



  String extractDocumentId(String source)

  {

    int namePosition = source.indexOf("\"name\"");



    if (namePosition == -1)

    {

      Serial.println("Document name not found.");

      return "";

    }



    int quoteStart = source.indexOf("\"", namePosition + 6);



    if (quoteStart == -1)

    {

      return "";

    }



    quoteStart++;



    int quoteEnd = source.indexOf("\"", quoteStart);



    if (quoteEnd == -1)

    {

      return "";

    }



    String fullPath = source.substring(quoteStart, quoteEnd);



    Serial.println("Full document path:");

    Serial.println(fullPath);



    int lastSlash = fullPath.lastIndexOf('/');



    if (lastSlash == -1)

    {

      return "";

    }



    String documentId = fullPath.substring(lastSlash + 1);



    return documentId;

  }

  // ================= SEARCH PENDING REGISTRATION =================



  void searchPendingRegistration()

  {

    if (registrationQueryRunning)

    {

      return;

    }



    registrationQueryRunning = true;



    StructuredQuery query;



    query.from(

      CollectionSelector("registration_requests", false)

    );



    FieldFilter statusFilter;



    Values::StringValue pendingValue("pending");

    Values::Value statusValue(pendingValue);



    statusFilter

      .field(FieldReference("status"))

      .op(FieldFilterOperator::EQUAL)

      .value(statusValue);



    Filter filter(statusFilter);

    query.where(filter);



    query.limit(1);



    QueryOptions queryOptions;

    queryOptions.structuredQuery(query);



    Docs.runQuery(

      aClient,

      Firestore::Parent(FIREBASE_PROJECT_ID),

      "",

      queryOptions,

      processRegistrationQuery,

      "registrationSearch"

    );

  }



  // ================= PROCESS REGISTRATION QUERY =================



  void processRegistrationQuery(AsyncResult &aResult)

  {





    if (!aResult.isResult())

    {

      return;

    }



    if (aResult.isError())
    {
      String registrationError = aResult.error().message();

      Serial.print("Registration query error: ");
      Serial.println(registrationError);

      registrationQueryRunning = false;

      if (
        registrationError.indexOf("429") != -1 ||
        registrationError.indexOf("Quota") != -1 ||
        registrationError.indexOf("RESOURCE_EXHAUSTED") != -1
      )
      {
        Serial.println("Firebase quota/backoff detected.");
      }

      return;
    }



    if (!aResult.available())

    {

      return;

    }



    String response = aResult.c_str();



    Serial.println();

    Serial.println("REGISTRATION RESPONSE:");

    Serial.println(response);



    registrationQueryRunning = false;



    if (response.indexOf("\"document\"") == -1)

    {

      Serial.println("No pending registration found.");

      return;

    }



    String requestId = extractDocumentId(response);



    String studentId =

      extractStringField(response, "student_id");



    String status =

      extractStringField(response, "status");



    Serial.println("========== PARSED DATA ==========");

    Serial.println("Request ID: [" + requestId + "]");

    Serial.println("Student ID: [" + studentId + "]");

    Serial.println("Status: [" + status + "]");

    Serial.println("=================================");



    if (requestId == "" || studentId == "")

    {

      Serial.println(

        "Registration document fields missing."

      );



      return;

    }



    registrationRequestId = requestId;

    registrationStudentId = studentId;



    status.trim();
    status.toLowerCase();

    if (status == "pending")
    {
      registrationPending = true;
      registrationArmedAt = millis();

      Serial.println("Registration pending.");
      Serial.println("Registration mode armed for 5 minutes.");
      Serial.println("Scan the NEW/REPLACEMENT RFID card now.");
    }

  }



  // ================= REGISTER RFID =================



  void registerRFIDToStudent()

  {

    if (registrationStudentId == "")

    {

      Serial.println("ERROR: Student ID is empty!");

      return;

    }



    Serial.println("Updating student RFID...");

    Serial.println("Student ID: " + registrationStudentId);

    Serial.println("RFID UID: " + currentRFID);



    Values::StringValue uidValue(currentRFID);



    Document<Values::Value> document(

      "rfid_uid",

      Values::Value(uidValue)

    );



    PatchDocumentOptions patchOptions(

      DocumentMask("rfid_uid"),

      DocumentMask(),

      Precondition()

    );



    String documentPath =

      "students/" + registrationStudentId;



    Docs.patch(

      aClient,

      Firestore::Parent(FIREBASE_PROJECT_ID),

      documentPath,

      patchOptions,

      document,

      processStudentRegistration,

      "studentRegistration"

    );



    Serial.println(

      "Student RFID update request sent."

    );

  }



  // ================= PROCESS STUDENT REGISTRATION =================



  void processStudentRegistration(AsyncResult &aResult)

  {

    if (!aResult.isResult())

    {

      return;

    }



    if (registrationCompletionRunning)

    {

      return;

    }



    if (aResult.isError())

    {

      Serial.println("Student registration failed:");

      Serial.println(aResult.error().message());



      registrationPending = false;

      registrationQueryRunning = false;

      cardProcessing = false;



      redLED();

      showReadyScreen();

      return;

    }



    Serial.println("Student RFID update successful.");



    registrationCompletionRunning = true;



    completeRegistrationRequest();

  }



  // ================= COMPLETE REGISTRATION =================



  void completeRegistrationRequest()

  {

    Serial.println("========== COMPLETING REQUEST ==========");

    Serial.println("Request ID: " + registrationRequestId);

    Serial.println("RFID UID: " + currentRFID);



    Values::StringValue statusValue("completed");

    Values::StringValue uidValue(currentRFID);



    Document<Values::Value> document(

      "status",

      Values::Value(statusValue)

    );



    document.add(

      "rfid_uid",

      Values::Value(uidValue)

    );



    PatchDocumentOptions patchOptions(

      DocumentMask("status,rfid_uid"),

      DocumentMask(),

      Precondition()

    );



    String documentPath =

      "registration_requests/" + registrationRequestId;



    Docs.patch(

      aClient,

      Firestore::Parent(FIREBASE_PROJECT_ID),

      documentPath,

      patchOptions,

      document,

      processRegistrationCompletion,

      "registrationCompletion"

    );



    Serial.println("Registration completion request sent.");

  }



  // ================= PROCESS COMPLETION =================



  void processRegistrationCompletion(AsyncResult &aResult)

  {

    if (!aResult.isResult())

    {

      return;

    }



    Serial.println("========== COMPLETION CALLBACK ==========");



    if (aResult.isError())

    {

      Serial.println("ERROR: Request completion failed!");

      Serial.println(aResult.error().message());



      redLED();



      showLCD(

        "REQUEST UPDATE",

        "FAILED"

      );



      delay(2000);

    }

    else if (aResult.available())

    {

      Serial.println("SUCCESS: Registration request completed.");

      updateStudentCacheAfterRegistration(registrationStudentId, currentRFID);



      greenLED();



      showLCD(

        "REGISTRATION",

        "SUCCESS"

      );



      delay(2500);

    }

    else

    {

      Serial.println("Completion response received, but no data available.");

      return;

    }

    registrationCompletionRunning = false;



    registrationPending = false;

    registrationQueryRunning = false;



    registrationRequestId = "";

    registrationStudentId = "";



    cardProcessing = false;



    showReadyScreen();

  }



  // ================= SEARCH STUDENT =================



  void searchStudentByRFID(String uid)
  {
    Serial.println();
    Serial.println("========== LOCAL STUDENT SEARCH ==========");
    Serial.println("Scanned RFID UID: " + uid);
    Serial.println("NO Firestore student search is performed for this scan.");

    StudentCacheEntry* student = findStudentInCache(uid);

    if (student == nullptr)
    {
      Serial.println("Student not found in local cache.");
      redLED();
      showLCD("UNKNOWN CARD", "NOT REGISTERED");
      delay(2000);
      showReadyScreen();
      cardProcessing = false;
      return;
    }

    currentStudentId = student->id;
    currentStudentName = student->name;
    currentStudentRollNo = student->rollNo;
    currentStudentDepartment = student->department;
    currentStudentClass = student->studentClass;

    // Never carry a previous scan's timetable into this scan.
    activeSubjectID = "";
    activeSubjectName = "";
    activeSubjectCode = "";
    activeTeacherUid = "";
    activeTimetableID = "";
    activeRoom = "";
    activeType = "";

    Serial.println("Student ID: " + currentStudentId);
    Serial.println("Student Name: " + currentStudentName);
    Serial.println("Roll No: " + currentStudentRollNo);
    Serial.println("Department: " + currentStudentDepartment);
    Serial.println("Class/Batch: " + currentStudentClass);
    Serial.println("Active: " + String(student->active ? "TRUE" : "FALSE"));

    if (!student->active)
    {
      redLED();
      showLCD("STUDENT", "INACTIVE");
      delay(2000);
      showReadyScreen();
      cardProcessing = false;
      return;
    }

    showLCD("STUDENT FOUND", currentStudentName);
    delay(1000);

    // IMPORTANT: attendance is allowed only when a currently selected
    // timetable entry matches this student, day, and time.
    showLCD("CHECKING", "TIMETABLE...");
    delay(500);
    searchCurrentTimetable();
  }

  // ================= PROCESS STUDENT =================



  void processStudentQuery(AsyncResult &aResult)

  {

    if (!aResult.isResult())

    {

      return;

    }



    if (aResult.isError())

    {

      Serial.println("Student query error:");

      Serial.println(aResult.error().message());



      redLED();



      showLCD("STUDENT QUERY", "FAILED");

      delay(2000);



      showReadyScreen();

      cardProcessing = false;

      return;

    }



    if (!aResult.available())

    {

      return;

    }



    String response = aResult.c_str();



    Serial.println();

    Serial.println("========== STUDENT RESPONSE ==========");

    Serial.println(response);

    Serial.println("======================================");



    if (response.indexOf("\"document\"") == -1)

    {

      Serial.println("Student not found.");



      redLED();

      showLCD("UNKNOWN CARD", "NOT REGISTERED");

      delay(2000);



      showReadyScreen();

      cardProcessing = false;

      return;

    }



    currentStudentId = extractDocumentId(response);



    currentStudentName =

      extractFirstStringField(

        response,

        "name",

        "studentName",

        ""

      );



    currentStudentRollNo =

      extractFirstStringField(

        response,

        "roll_no",

        "rollNo",

        ""

      );



    currentStudentDepartment =

      extractFirstStringField(

        response,

        "department",

        "branch",

        ""

      );



    currentStudentClass =

      extractFirstStringField(

        response,

        "class",

        "studentClass",

        "batch"

      );



    bool active = extractStudentActive(response);



    Serial.println();

    Serial.println("========== STUDENT DATA ==========");

    Serial.println("Student ID: " + currentStudentId);

    Serial.println("Student Name: " + currentStudentName);

    Serial.println("Roll No: " + currentStudentRollNo);

    Serial.println("Department: " + currentStudentDepartment);

    Serial.println("Class/Batch: " + currentStudentClass);

    Serial.println("Active: " + String(active ? "TRUE" : "FALSE"));

    Serial.println("RFID: " + currentRFID);

    Serial.println("==================================");



    if (!active)

    {

      Serial.println("Student is inactive/blocked.");



      redLED();

      showLCD("STUDENT", "INACTIVE");

      delay(2000);



      showReadyScreen();

      cardProcessing = false;

      return;

    }



    if (currentStudentId == "")

    {

      redLED();

      showLCD("STUDENT ID", "ERROR");

      delay(2000);



      showReadyScreen();

      cardProcessing = false;

      return;

    }



    showLCD("STUDENT FOUND", currentStudentName);
    delay(1000);

    // IMPORTANT: attendance must pass the timetable check first.
    showLCD("CHECKING", "TIMETABLE...");
    delay(500);
    searchCurrentTimetable();

  }



  // ================= SEARCH TIMETABLE =================



  void searchCurrentTimetable()

  {
    // Clear previous timetable state before checking this scan.
    activeSubjectID = "";
    activeTeacherUid = "";
    activeTimetableID = "";
    activeRoom = "";
    activeType = "";

    StructuredQuery query;



    query.from(

      CollectionSelector("timetable", false)

    );



    query.limit(100);



    QueryOptions queryOptions;



    queryOptions.structuredQuery(query);



    Docs.runQuery(

      aClient,

      Firestore::Parent(FIREBASE_PROJECT_ID),

      "",

      queryOptions,

      processTimetableQuery,

      "timetableSearch"

    );



  }



  // ================= PROCESS TIMETABLE =================



  void processTimetableQuery(AsyncResult &aResult)

  {

    if (!aResult.isResult())

    {

      return;

    }



    if (aResult.isError())

    {

      Serial.println("Timetable query error:");

      Serial.println(aResult.error().message());



      redLED();

      showLCD("TIMETABLE", "QUERY FAILED");

      delay(2000);



      showReadyScreen();

      cardProcessing = false;

      return;

    }



    if (!aResult.available())

    {

      return;

    }



    String response = aResult.c_str();



    String today = getDay();

    int currentMinutes = getCurrentMinutes();



    Serial.println();

    Serial.println("---------- TIMETABLE CHECK ----------");

    Serial.println("Today: [" + today + "]");

    Serial.println("Current Time: [" + getTime() + "]");

    Serial.println("Current Minutes: " + String(currentMinutes));



    if (currentMinutes == -1 || today == "")

    {

      redLED();

      showLCD("TIME ERROR", "TRY AGAIN");

      delay(2000);



      showReadyScreen();

      cardProcessing = false;

      return;

    }



    bool timetableFound = false;

    int searchPosition = 0;



    while (true)

    {

      int documentPosition =

        response.indexOf("\"document\":", searchPosition);



      if (documentPosition == -1)

      {

        break;

      }



      int nextDocumentPosition =

        response.indexOf(

          "\"document\":",

          documentPosition + 12

        );



      int endPosition =

        (nextDocumentPosition == -1)

        ? response.length()

        : nextDocumentPosition;



      String timetableDocument =

        response.substring(

          documentPosition,

          endPosition

        );



      searchPosition = endPosition;



      String branch = extractStringField(timetableDocument, "branch");

      String timetableClass = extractStringField(timetableDocument, "class");

      String timetableDay = extractStringField(timetableDocument, "day");

      String startTime = extractStringField(timetableDocument, "startTime");

      String endTime = extractStringField(timetableDocument, "endTime");

      String subjectID = extractStringField(timetableDocument, "subjectID");
      String subjectName = extractStringField(timetableDocument, "subjectName");
      String subjectCode = extractStringField(timetableDocument, "subjectCode");

      String teacherUid = extractStringField(timetableDocument, "teacherUid");

      String room = extractStringField(timetableDocument, "room");

      String type = extractStringField(timetableDocument, "type");



      // A timetable is selectable/usable for attendance ONLY when its
      // Firestore `active` boolean is true. Do not treat a status string
      // as active, otherwise an unselected timetable can still match.
      bool active = firestoreBooleanTrue(timetableDocument, "active");



      String timetableID = extractDocumentId(timetableDocument);



      int startMinutes = convertTimeToMinutes(startTime);

      int endMinutes = convertTimeToMinutes(endTime);



      bool branchMatches = branchMatchesStudent(

        branch,

        currentStudentDepartment

      );



      bool classMatches = classMatchesStudent(

        timetableClass,

        currentStudentClass

      );



      bool dayMatches = timetableDay.equalsIgnoreCase(today);



      if (!dayMatches)

      {

        dayMatches = firestoreStringEquals(

          timetableDocument,

          "day",

          today

        );

      }



      bool timeMatches =

        startMinutes != -1 &&

        endMinutes != -1 &&

        currentMinutes >= startMinutes &&

        currentMinutes <= endMinutes;



      Serial.println();

      Serial.println("Timetable ID: [" + timetableID + "]");

      Serial.println("Branch: [" + branch + "]");

      Serial.println("Student Department: [" + currentStudentDepartment + "]");

      Serial.println("Branch Match: " + String(branchMatches ? "YES" : "NO"));

      Serial.println("Timetable Class: [" + timetableClass + "]");

      Serial.println("Student Class/Batch: [" + currentStudentClass + "]");

      Serial.println("Class Match: " + String(classMatches ? "YES" : "NO"));

      Serial.println("Timetable Day: [" + timetableDay + "]");

      Serial.println("Today: [" + today + "]");

      Serial.println("Day Match: " + String(dayMatches ? "YES" : "NO"));

      Serial.println("Start Time: [" + startTime + "]");

      Serial.println("End Time: [" + endTime + "]");

      Serial.println("Start Minutes: " + String(startMinutes));

      Serial.println("End Minutes: " + String(endMinutes));

      Serial.println("Time Match: " + String(timeMatches ? "YES" : "NO"));

      Serial.println("Subject ID: [" + subjectID + "]");

      Serial.println("Teacher UID: [" + teacherUid + "]");

      Serial.println("Room: [" + room + "]");

      Serial.println("Type: [" + type + "]");

      Serial.println("Active: " + String(active ? "YES" : "NO"));



      if (active &&
          timetableID != "" &&
          subjectID != "" &&
          branchMatches &&
          classMatches &&
          dayMatches &&
          timeMatches)

      {

        Serial.println();

        Serial.println("******** TIMETABLE MATCH FOUND ********");



        activeSubjectID = subjectID;
        activeSubjectName = subjectName;
        activeSubjectCode = subjectCode;

        activeTeacherUid = teacherUid;

        activeTimetableID = timetableID;

        activeRoom = room;

        activeType = type;



        timetableFound = true;



        showLCD("TIMETABLE FOUND", "MARKING...");

        delay(1200);

        break;

      }

    }



    if (!timetableFound)

    {

      Serial.println();

      Serial.println("******** NO TIMETABLE AVAILABLE ********");



      redLED();

      showLCD("NO TIMETABLE", "AVAILABLE");

      delay(2500);



      showReadyScreen();

      cardProcessing = false;

      return;

    }



    createAttendance();

  }



  // ================= TIMETABLE PARSER HELPERS =================



  String normalizeText(String value)

  {

    value.trim();

    value.toUpperCase();



    // Normalize common separators/spaces.

    value.replace("&", "AND");

    value.replace("_", " ");

    value.replace("-", " ");



    while (value.indexOf("  ") != -1)

    {

      value.replace("  ", " ");

    }



    value.trim();

    return value;

  }



  bool firestoreStringEquals(

    String source,

    String fieldName,

    String expectedValue

  )

  {

    String actualValue = extractStringField(source, fieldName);



    if (actualValue == "")

    {

      return false;

    }



    return normalizeText(actualValue) == normalizeText(expectedValue);

  }



  bool firestoreBooleanTrue(

    String source,

    String fieldName

  )

  {

    return extractBooleanField(source, fieldName);

  }



  bool branchMatchesStudent(String timetableBranch, String studentDepartment)

  {

    String t = normalizeText(timetableBranch);

    String s = normalizeText(studentDepartment);



    if (t == "" || s == "")

    {

      return false;

    }



    if (t == s)

    {

      return true;

    }



    // Dashboard commonly uses the full branch name while student documents

    // may use the shorter department code.

    if ((t == "AIANDDATASCIENCE" || t == "AIDATASCIENCE") &&

        (s == "AIDS" || s == "AIDATA" || s == "AIANDDATASCIENCE" || s == "AIDATASCIENCE"))

    {

      return true;

    }



    return false;

  }



  bool classMatchesStudent(String timetableClass, String studentClass)

  {

    String t = normalizeText(timetableClass);

    String s = normalizeText(studentClass);



    if (t == "" || s == "")

    {

      return false;

    }



    if (t == s)

    {

      return true;

    }



    // Allow common year representations if one side is numeric.

    if ((t == "THIRDYEAR" || t == "3RDYEAR" || t == "YEAR3" || t == "3") &&

        (s == "THIRDYEAR" || s == "3RDYEAR" || s == "YEAR3" || s == "3"))

    {

      return true;

    }



    return false;

  }



  // ================= CREATE ATTENDANCE =================



  // ================= DAILY ATTENDANCE WINDOW =================

bool isWithinAttendanceWindow()
{
  int currentMinutes = getCurrentMinutes();

  if (currentMinutes < 0)
  {
    return false;
  }

  return currentMinutes >= ATTENDANCE_START_MINUTES &&
         currentMinutes <= ATTENDANCE_END_MINUTES;
}

void showAttendanceWindowClosed()
{
  int currentMinutes = getCurrentMinutes();

  redLED();

  if (currentMinutes >= 0 && currentMinutes < ATTENDANCE_START_MINUTES)
  {
    showLCD("ATTENDANCE", "STARTS 09:00");
  }
  else
  {
    showLCD("ATTENDANCE", "CLOSED 15:50");
  }

  delay(2000);
  showReadyScreen();
  cardProcessing = false;
}

void createAttendance()
{
  if (attendanceCreateRunning)
  {
    Serial.println("Attendance write already running.");
    return;
  }

  String currentDate = getDate();
  String currentTime = getTime();

  // Hard safety gate: no timetable = no attendance write.
  if (activeTimetableID == "" || activeSubjectID == "" ||
      activeTeacherUid == "")
  {
    Serial.println("Attendance rejected: no valid selected timetable is active.");
    redLED();
    showLCD("NO TIMETABLE", "SELECT FIRST");
    delay(2000);
    showReadyScreen();
    cardProcessing = false;
    return;
  }

  if (!isWithinAttendanceWindow())
  {
    Serial.println("Attendance rejected: outside 09:00-15:50 window.");
    showAttendanceWindowClosed();
    return;
  }

  if (currentStudentId == "" || currentRFID == "")
  {
    Serial.println("Attendance rejected: missing student ID or RFID.");
    redLED();
    showLCD("ATTENDANCE", "DATA ERROR");
    delay(2000);
    showReadyScreen();
    cardProcessing = false;
    return;
  }

  // One deterministic document per student per day.
  attendanceDocumentId = currentStudentId + "_" + currentDate;
  attendanceDocumentId.replace("/", "_");

  Values::StringValue dateValue(currentDate);
  Values::StringValue timeValue(currentTime);
  Values::StringValue studentValue(currentStudentId);
  Values::StringValue uidValue(currentRFID);
  Values::StringValue subjectValue(activeSubjectID);
  Values::StringValue subjectNameValue(activeSubjectName);
  Values::StringValue subjectCodeValue(activeSubjectCode);
  Values::StringValue teacherValue(activeTeacherUid);
  Values::StringValue timetableValue(activeTimetableID);
  Values::StringValue roomValue(activeRoom);
  Values::StringValue typeValue(activeType);
  Values::StringValue windowValue("09:00-15:50");

  Document<Values::Value> document(
    "date",
    Values::Value(dateValue)
  );

  document.add("time", Values::Value(timeValue));
  document.add("student_id", Values::Value(studentValue));
  document.add("rfid_uid", Values::Value(uidValue));
  document.add("subject_id", Values::Value(subjectValue));
  if (activeSubjectName != "")
  {
    document.add("subject_name", Values::Value(subjectNameValue));
  }
  if (activeSubjectCode != "")
  {
    document.add("subject_code", Values::Value(subjectCodeValue));
  }
  document.add("teacher_uid", Values::Value(teacherValue));
  document.add("timetable_id", Values::Value(timetableValue));
  document.add("room", Values::Value(roomValue));
  document.add("attendance_type", Values::Value(typeValue));
  document.add("attendance_window", Values::Value(windowValue));

  attendanceCreateRunning = true;

  Serial.println();
  Serial.println("========== ATTENDANCE WRITE ==========");
  Serial.println("Student: " + currentStudentName);
  Serial.println("Student ID: " + currentStudentId);
  Serial.println("RFID: " + currentRFID);
  Serial.println("Date: " + currentDate);
  Serial.println("Time: " + currentTime);
  Serial.println("Timetable ID: " + activeTimetableID);
  Serial.println("Subject ID: " + activeSubjectID);
  Serial.println("Teacher UID: " + activeTeacherUid);
  Serial.println("Document ID: " + attendanceDocumentId);
  Serial.println("======================================");

  Docs.createDocument(
    aClient,
    Firestore::Parent(FIREBASE_PROJECT_ID),
    "attendance",
    attendanceDocumentId,
    DocumentMask(),
    document,
    processDailyAttendanceCreate,
    "dailyAttendanceCreate"
  );

  Serial.println("Attendance create request sent.");
}


// ================= PROCESS DAILY ATTENDANCE =================

void processDailyAttendanceCreate(AsyncResult &aResult)
{
  if (!aResult.isResult())
  {
    return;
  }

  // AsyncResult can report debug/event information separately. Only finish
  // the attendance workflow on an actual error or final payload.
  if (aResult.isError())
  {
    String errorMessage = aResult.error().message();
    String errorLower = errorMessage;
    errorLower.toLowerCase();
    int errorCode = aResult.error().code();

    Serial.println("Daily attendance write error:");
    Serial.print("Error code: ");
    Serial.println(errorCode);
    Serial.println(errorMessage);

    // The daily document uses a deterministic ID (student + date). A second
    // scan can therefore produce ALREADY_EXISTS / HTTP 409 even though the
    // attendance is already correctly stored in Firestore.
    bool alreadyExists =
      errorCode == 6 ||
      errorCode == 409 ||
      errorLower.indexOf("already_exists") != -1 ||
      errorLower.indexOf("already exists") != -1 ||
      errorLower.indexOf("conflict") != -1 ||
      errorLower.indexOf("409") != -1;

    attendanceCreateRunning = false;

    if (alreadyExists)
    {
      Serial.println("Student already marked today.");
      greenLED();
      showLCD("ALREADY", "PRESENT TODAY");
      delay(2000);
      showReadyScreen();
      cardProcessing = false;
      return;
    }

    redLED();
    showLCD("ATTENDANCE", "FAILED");
    delay(2000);
    showReadyScreen();
    cardProcessing = false;
    return;
  }

  if (!aResult.available())
  {
    return;
  }

  attendanceCreateRunning = false;

  Serial.println("Daily attendance marked successfully.");
  Serial.println(aResult.c_str());

  greenLED();
  showLCD("ATTENDANCE", "MARKED");
  delay(1500);
  showLCD(currentStudentName, "PRESENT");
  delay(2000);
  showReadyScreen();
  cardProcessing = false;
}
// 



  void processAttendanceWrite(AsyncResult &aResult)

  {

    if (!aResult.isResult())

    {

      return;

    }



    if (aResult.isError())

    {

      Serial.println(

        aResult.error().message()

      );



      redLED();



      showLCD(

        "ATTENDANCE",

        "FAILED"

      );



      delay(2000);



      showReadyScreen();

      cardProcessing = false;



      return;

    }



    if (aResult.available())

    {

      Serial.println(

        "Attendance marked successfully."

      );



      Serial.println(

        aResult.c_str()

      );



      greenLED();



      showLCD(

        "ATTENDANCE",

        "MARKED"

      );



      delay(1500);



      showLCD(

        currentStudentName,

        "PRESENT"

      );



      delay(2000);



      showReadyScreen();

      cardProcessing = false;

    }

  }



  // ================= WIFI =================



  void initializeWiFi()

  {

    showLCD(

      "WIFI",

      "CONNECTING..."

    );



    WiFi.mode(WIFI_STA);



    WiFi.begin(

      WIFI_SSID,

      WIFI_PASSWORD

    );



    Serial.print(

      "Connecting to Wi-Fi"

    );



    unsigned long startTime = millis();



    const unsigned long WIFI_TIMEOUT = 20000;



    while (

      WiFi.status() != WL_CONNECTED &&

      millis() - startTime < WIFI_TIMEOUT

    )

    {

      Serial.print(".");

      delay(500);

    }



    Serial.println();



    if (WiFi.status() != WL_CONNECTED)

    {

      Serial.println(

        "Wi-Fi connection failed."

      );



      showLCD(

        "WIFI FAILED",

        "CHECK SETTINGS"

      );



      redLED();



      delay(3000);



      ESP.restart();

    }



    Serial.println(

      "Wi-Fi connected."

    );



    Serial.print(

      "ESP32 IP: "

    );



    Serial.println(

      WiFi.localIP()

    );



    showLCD(

      "WIFI CONNECTED",

      "OK"

    );



    delay(1000);

  }



  // ================= FIREBASE =================



  void initializeFirebase()

  {

    sslClient.setInsecure();



    showLCD(

      "FIREBASE",

      "CONNECTING..."

    );



    initializeApp(

      aClient,

      app,

      getAuth(user_auth),

      authDebugPrint,

      "firebaseAuth"

    );



    app.getApp<Firestore::Documents>(

      Docs

    );



    Serial.println(

      "Firebase initialization started."

    );



    showLCD(

      "FIREBASE",

      "INITIALIZING..."

    );

  }



  // ================= RFID INITIALIZATION =================



  void initializeRFID()
{
  SPI.begin(18, 19, 23, SS_PIN);

  rfid.PCD_Init();
  delay(500);

  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);

  Serial.print("RC522 Version: 0x");
  Serial.println(version, HEX);

  // 0x00, 0xFF and 0xEE are treated as invalid/unreliable reads.
  if (version == 0x00 || version == 0xFF || version == 0xEE) {
    Serial.println("RC522 not detected.");

    showLCD("RFID ERROR", "CHECK RC522");
    redLED();
    return;
  }

  Serial.println("RC522 ready.");
}

// ================= LCD INITIALIZATION =================



  void initializeLCD()

  {

    Wire.begin(

      21,

      22

    );



    lcd.init();

    lcd.backlight();



    showLCD(

      "ATTENDIX",

      "STARTING..."

    );

  }



  // ================= SETUP =================



  void setup()

  {

    Serial.begin(115200);

    delay(1000);

    initializeLCD();
    initializeLEDs();
    initializeRFID();

    // IMPORTANT: load RFID mappings from ESP32 flash.
    // This does not query Firestore and does not depend on Firebase.
    loadStudentCacheFromNVS();

    showReadyScreen();

    initializeWiFi();

    configTime(
      19800,
      0,
      "pool.ntp.org",
      "time.nist.gov"
    );

    initializeFirebase();

    // Hardware is ready even while Firebase is still authenticating.
    showReadyScreen();
  }


  // ================= LOOP =================



  void loop()

  {

    app.loop();



    // RFID identification is fully local.
    // Never query the students collection during normal attendance.
    if (!studentCacheLoaded)
    {
      loadStudentCacheFromNVS();
    }

    if (registrationPending &&
        registrationArmedAt > 0 &&
        millis() - registrationArmedAt >= REGISTRATION_ARM_TIMEOUT)
    {
      Serial.println("Registration mode expired. No card was registered.");
      registrationPending = false;
      registrationQueryRunning = false;
      registrationRequestId = "";
      registrationStudentId = "";
      registrationArmedAt = 0;
    }

    if (

    !cardProcessing &&

    !registrationPending &&

    millis() - lastRegistrationCheck >=

    REGISTRATION_CHECK_INTERVAL

  )

  {

    lastRegistrationCheck = millis();



    Serial.println("Checking registration requests...");



    searchPendingRegistration();

  }

    if (!firebaseReady && app.ready())
    {
      firebaseReady = true;

      Serial.println();
      Serial.println("==============================");
      Serial.println("FIREBASE READY");
      Serial.println("==============================");

      showReadyScreen();
    }

    if (cardProcessing)

    {

      delay(100);

      return;

    }



    if (!rfid.PICC_IsNewCardPresent())

    {

      delay(50);

      return;

    }



    if (!rfid.PICC_ReadCardSerial())

    {

      Serial.println(

        "RFID UID read failed."

      );



      redLED();



      showLCD(

        "CARD ERROR",

        "TRY AGAIN"

      );



      delay(1500);



      showReadyScreen();



      return;

    }

    cardProcessing = true;



    currentRFID = readRFID();



    Serial.println();

    Serial.println(

      "========== CARD DETECTED =========="

    );



    Serial.println(

      "RFID UID: " + currentRFID

    );



    Serial.println(

      "===================================="

    );



    showLCD(

      "CARD DETECTED",

      currentRFID

    );



    rfid.PICC_HaltA();

    rfid.PCD_StopCrypto1();



    delay(1000);



  // ================= REGISTRATION MODE =================

  // A pending registration request does NOT automatically turn every
  // registered card into registration mode. Known cards always go through
  // normal attendance. Only an UNKNOWN card can be used for a pending
  // registration request (new/replacement card workflow).
  StudentCacheEntry* knownStudent = findStudentInCache(currentRFID);

  if (registrationPending && knownStudent == nullptr &&
      registrationStudentId != "" && registrationRequestId != "")
  {
    Serial.println();
    Serial.println("========== REGISTRATION MODE ==========");

    Serial.println(
      "Registering RFID to student: " +
      registrationStudentId
    );

    showLCD(
      "REGISTERING RFID",
      "PLEASE WAIT..."
    );

    registerRFIDToStudent();
    return;
  }

  if (registrationPending && knownStudent != nullptr)
  {
    Serial.println("Known registered RFID detected.");
    Serial.println("Skipping registration and continuing attendance.");
  }



  // ================= ATTENDANCE MODE =================

  if (!isWithinAttendanceWindow())
  {
    showAttendanceWindowClosed();
    return;
  }

  showLCD(
    "SEARCHING",
    "STUDENT..."
  );

  searchStudentByRFID(currentRFID);

  }