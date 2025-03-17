// Import necessary libraries
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');
const dotenv = require("dotenv");
const config = dotenv.config({ path: __dirname + '/.env' }).parsed;

const databases = [process.env.DATABASES.includes(",") ? process.env.DATABASES.split(",") : process.env.DATABASES]; // Array of database names to analyze

// Database connection details
const dbConfig = {
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASSWORD
};
let totalAllDatabaseSize = 0;
const databaseSizes = []; // To store the sizes for each database

(async () => {
    let connection;

    try {
        console.log('Connecting to MySQL database...');
        // Connect to MySQL
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database!');

        console.log(`Found ${databases.length} databases.`);

        // Initialize a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const consolidatedData = [];

        // Helper function to format size with appropriate unit
        const formatSizeWithUnit = (sizeInKiB) => {
            const size = Number(sizeInKiB) || 0;
            if (size >= 1024 * 1024) {
                return `${(size / (1024 * 1024)).toFixed(2)} GiB`;
            } else if (size >= 1024) {
                return `${(size / 1024).toFixed(2)} MiB`;
            } else if (size < 1) {
                return `${(size * 1024).toFixed(2)} B`;
            } else {
                return `${size.toFixed(2)} KiB`;
            }
        };

        // Function to format and log total size
        const logTotalSize = (totalSizeKiB) => {
            const sizeKiB = Number(totalSizeKiB) || 0;
            const sizeMiB = (sizeKiB / 1024).toFixed(2);
            const sizeGiB = (sizeKiB / (1024 * 1024)).toFixed(2);
            console.log(`Total size: ${sizeKiB.toFixed(2)} KiB (${sizeMiB} MiB / ${sizeGiB} GiB)`);
            return { sizeKiB: sizeKiB.toFixed(2), sizeMiB, sizeGiB };
        };

        // Loop through each database
        for (const db of databases) {
            const dbName = db;
            console.log(`\nProcessing database: ${dbName}...`);

            // Use the database
            await connection.query(`USE \`${dbName}\``);

            // Get all tables in the database
            const [tables] = await connection.query('SHOW TABLES');
            const tableNames = tables.map(table => `\`${Object.values(table)[0]}\``);
            console.log(`Found ${tableNames.length} tables in database: ${dbName}.`);

            if (tableNames.length > 0) {
                // Analyze all tables in a single query
                const analyzeQuery = `ANALYZE TABLE ${tableNames.join(', ')}`;
                console.log(`Analyzing tables in database: ${dbName}...`);
                await connection.query(analyzeQuery);
                console.log(`Analyzed tables in database: ${dbName}.`);

                // Get the size for each table with additional details, including `data_free`
                const [analyzedTables] = await connection.query(`
                    SELECT 
                      table_name AS TableName, 
                      data_length, 
                      index_length,
                      data_free,
                      ROUND((data_length + index_length + data_free) / 1024, 2) AS Size
                    FROM information_schema.TABLES
                    WHERE table_schema = '${dbName}';
                `);

                // Log individual table details
                let totalSize = 0;
                let largestTable = { name: '', size: 0, formattedSize: '0 KiB' }; // Track the largest table for this database

                analyzedTables.forEach(table => {
                    const tableSize = parseFloat(table.Size ?? 0);
                    totalSize += tableSize;

                    // Track the largest table
                    if (tableSize > largestTable.size) {
                        largestTable = { name: table.TableName, size: tableSize, formattedSize: formatSizeWithUnit(tableSize) };
                    }

                    console.log(`Table: ${table.TableName}, Data Length: ${table.data_length || 0}, Index Length: ${table.index_length || 0}, Data Free: ${table.data_free || 0}, Size: ${table.Size} KiB`);
                });

                if (totalSize > 0) {
                    totalAllDatabaseSize += totalSize;
                    console.log(`Total size of tables in database ${dbName}:`);
                    const formattedSize = logTotalSize(totalSize);
                    // Store the database size details for the summary sheet, including largest table info with formatted size
                    databaseSizes.push({
                        DatabaseName: dbName,
                        SizeKiB: formattedSize.sizeKiB,
                        SizeMiB: formattedSize.sizeMiB,
                        SizeGiB: formattedSize.sizeGiB,
                        LargestTableName: largestTable.name,
                        LargestTableSize: largestTable.formattedSize
                    });
                } else {
                    console.log(`Total size of tables in database ${dbName} is empty or contains no data.`);
                }

                // Add a new worksheet for the current database
                const worksheet = workbook.addWorksheet(dbName);
                worksheet.columns = [
                    { header: 'Table Name', key: 'TableName', width: 30 },
                    { header: 'Size (KiB)', key: 'Size', width: 15 }
                ];

                // Populate data for the worksheet
                analyzedTables.forEach(table => {
                    worksheet.addRow(table);
                    const formattedTableSize = formatSizeWithUnit(table.Size);
                    consolidatedData.push({
                        DatabaseName: dbName,
                        TableName: table.TableName,
                        Size: formattedTableSize,
                    });
                });
                console.log(`Added tables and sizes for database: ${dbName} to the Excel sheet.`);
            } else {
                console.log(`No tables found in database: ${dbName}. Skipping.`);
            }
        }

        // Create a consolidated sheet for all tables
        console.log('Creating consolidated data sheet...');
        const consolidatedSheet = workbook.addWorksheet('Consolidated Data');
        consolidatedSheet.columns = [
            { header: 'Database Name', key: 'DatabaseName', width: 30 },
            { header: 'Table Name', key: 'TableName', width: 30 },
            { header: 'Size', key: 'Size', width: 20 }
        ];

        // Add rows to the consolidated sheet
        consolidatedData.forEach(row => {
            consolidatedSheet.addRow(row);
        });
        console.log('Consolidated data sheet created.');

        // Create a summary sheet for the database sizes
        console.log('Creating database size summary sheet...');
        const summarySheet = workbook.addWorksheet('Database Size Summary');
        summarySheet.columns = [
            { header: 'Database Name', key: 'DatabaseName', width: 30 },
            { header: 'Size (KiB)', key: 'SizeKiB', width: 15 },
            { header: 'Size (MiB)', key: 'SizeMiB', width: 15 },
            { header: 'Size (GiB)', key: 'SizeGiB', width: 15 },
            { header: 'Largest Table Name', key: 'LargestTableName', width: 30 },
            { header: 'Largest Table Size', key: 'LargestTableSize', width: 20 }
        ];

        // Add rows for each database's total size and largest table
        databaseSizes.forEach(dbSize => {
            summarySheet.addRow(dbSize);
        });

        // Add a final row for the total size of all databases
        const totalSizesFormatted = logTotalSize(totalAllDatabaseSize);
        summarySheet.addRow({
            DatabaseName: 'Total',
            SizeKiB: totalSizesFormatted.sizeKiB,
            SizeMiB: totalSizesFormatted.sizeMiB,
            SizeGiB: totalSizesFormatted.sizeGiB,
            LargestTableName: 'N/A',
            LargestTableSize: 'N/A'
        });
        
        console.log('Database size summary sheet created.');

        // Save the Excel file
        const filePath = 'Database_Tables_Info.xlsx';
        await workbook.xlsx.writeFile(filePath);
        console.log(`Excel file created successfully at: ${filePath}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
})();
