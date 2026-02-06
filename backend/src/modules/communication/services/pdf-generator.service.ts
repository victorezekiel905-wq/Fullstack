import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportCardData {
  tenantId: string;
  schoolName: string;
  schoolLogo?: string;
  schoolAddress: string;
  term: string;
  session: string;
  studentName: string;
  studentClass: string;
  admissionNumber: string;
  results: Array<{
    subject: string;
    ca: number;
    exam: number;
    total: number;
    grade: string;
    position: number;
    classAverage: number;
    remark: string;
  }>;
  summary: {
    totalScore: number;
    averageScore: number;
    position: number;
    totalStudents: number;
    grade: string;
    promotionStatus: string;
  };
  remarks: {
    teacher: string;
    headteacher?: string;
  };
  attendance: {
    daysPresent: number;
    daysAbsent: number;
    totalDays: number;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
}

export interface ReceiptData {
  tenantId: string;
  schoolName: string;
  schoolLogo?: string;
  schoolAddress: string;
  receiptNumber: string;
  studentName: string;
  studentClass: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  purpose: string;
  balance: number;
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private storage: Storage;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    // Initialize Google Cloud Storage or local storage
    this.bucketName = this.configService.get('GCS_BUCKET_NAME', 'synergyswift-documents');
    
    try {
      this.storage = new Storage();
    } catch (error) {
      this.logger.warn('GCS not configured, using local storage');
    }
  }

  /**
   * Generate report card PDF
   */
  async generateReportCard(data: ReportCardData): Promise<string> {
    this.logger.log(`Generating report card for ${data.studentName}`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const fileName = `report-${data.admissionNumber}-${data.term}-${Date.now()}.pdf`;
        const tempPath = path.join('/tmp', fileName);
        const writeStream = fs.createWriteStream(tempPath);

        doc.pipe(writeStream);

        // Header
        doc.fillColor(data.branding.primaryColor)
           .fontSize(24)
           .text(data.schoolName, { align: 'center' });

        doc.fillColor('#000000')
           .fontSize(10)
           .moveDown(0.5)
           .text(data.schoolAddress, { align: 'center' });

        doc.moveDown(1)
           .fontSize(16)
           .fillColor(data.branding.secondaryColor)
           .text(`${data.term} Report Card - ${data.session}`, { align: 'center' });

        // Student Information
        doc.moveDown(1.5)
           .fillColor('#000000')
           .fontSize(11);

        const startY = doc.y;
        doc.text(`Name: ${data.studentName}`, 40, startY);
        doc.text(`Class: ${data.studentClass}`, 300, startY);
        doc.text(`Admission No: ${data.admissionNumber}`, 40, startY + 20);

        // Results Table
        doc.moveDown(2);
        const tableTop = doc.y;
        const tableHeaders = ['Subject', 'CA', 'Exam', 'Total', 'Grade', 'Position', 'Class Avg', 'Remark'];
        const colWidths = [120, 40, 40, 40, 40, 50, 60, 80];
        let xPos = 40;

        // Table Headers
        doc.fillColor(data.branding.primaryColor).fontSize(9);
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
          xPos += colWidths[i];
        });

        // Table Rows
        let yPos = tableTop + 20;
        doc.fillColor('#000000').fontSize(9);

        data.results.forEach((result, index) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          xPos = 40;
          const rowData = [
            result.subject,
            result.ca.toString(),
            result.exam.toString(),
            result.total.toString(),
            result.grade,
            result.position.toString(),
            result.classAverage.toFixed(1),
            result.remark,
          ];

          rowData.forEach((text, i) => {
            doc.text(text, xPos, yPos, { width: colWidths[i], align: i === 0 ? 'left' : 'center' });
            xPos += colWidths[i];
          });

          yPos += 20;
        });

        // Summary
        doc.moveDown(2)
           .fontSize(11)
           .fillColor(data.branding.secondaryColor)
           .text('Summary', { underline: true });

        doc.moveDown(0.5)
           .fillColor('#000000')
           .fontSize(10)
           .text(`Total Score: ${data.summary.totalScore}`)
           .text(`Average Score: ${data.summary.averageScore.toFixed(2)}%`)
           .text(`Position: ${data.summary.position} out of ${data.summary.totalStudents}`)
           .text(`Grade: ${data.summary.grade}`)
           .text(`Promotion Status: ${data.summary.promotionStatus}`);

        // Attendance
        doc.moveDown(1)
           .fontSize(11)
           .fillColor(data.branding.secondaryColor)
           .text('Attendance', { underline: true });

        doc.moveDown(0.5)
           .fillColor('#000000')
           .fontSize(10)
           .text(`Days Present: ${data.attendance.daysPresent}`)
           .text(`Days Absent: ${data.attendance.daysAbsent}`)
           .text(`Total Days: ${data.attendance.totalDays}`);

        // Remarks
        doc.moveDown(1)
           .fontSize(11)
           .fillColor(data.branding.secondaryColor)
           .text('Remarks', { underline: true });

        doc.moveDown(0.5)
           .fillColor('#000000')
           .fontSize(10)
           .text(`Teacher's Remark: ${data.remarks.teacher}`);

        if (data.remarks.headteacher) {
          doc.text(`Headteacher's Remark: ${data.remarks.headteacher}`);
        }

        // Footer
        doc.moveDown(2)
           .fontSize(8)
           .fillColor('#666666')
           .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

        doc.end();

        writeStream.on('finish', async () => {
          try {
            // Upload to storage
            const publicUrl = await this.uploadFile(tempPath, fileName, data.tenantId);
            resolve(publicUrl);
          } catch (error) {
            reject(error);
          }
        });

        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate fee receipt PDF
   */
  async generateReceipt(data: ReceiptData): Promise<string> {
    this.logger.log(`Generating receipt ${data.receiptNumber}`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        const fileName = `receipt-${data.receiptNumber}-${Date.now()}.pdf`;
        const tempPath = path.join('/tmp', fileName);
        const writeStream = fs.createWriteStream(tempPath);

        doc.pipe(writeStream);

        // Header
        doc.fillColor(data.branding.primaryColor)
           .fontSize(20)
           .text(data.schoolName, { align: 'center' });

        doc.fillColor('#000000')
           .fontSize(9)
           .moveDown(0.3)
           .text(data.schoolAddress, { align: 'center' });

        doc.moveDown(1)
           .fontSize(16)
           .fillColor(data.branding.secondaryColor)
           .text('PAYMENT RECEIPT', { align: 'center' });

        // Receipt Details
        doc.moveDown(1.5)
           .fillColor('#000000')
           .fontSize(11);

        doc.text(`Receipt No: ${data.receiptNumber}`)
           .text(`Date: ${data.paymentDate}`)
           .text(`Student: ${data.studentName}`)
           .text(`Class: ${data.studentClass}`);

        // Payment Details Box
        doc.moveDown(1)
           .rect(40, doc.y, 380, 120)
           .fillAndStroke('#f0f0f0', data.branding.primaryColor);

        const boxY = doc.y + 10;
        doc.fillColor('#000000')
           .fontSize(12)
           .text('Payment Details', 50, boxY, { underline: true });

        doc.fontSize(11)
           .text(`Purpose: ${data.purpose}`, 50, boxY + 25)
           .text(`Payment Method: ${data.paymentMethod}`, 50, boxY + 45)
           .text(`Amount Paid: ₦${data.amount.toLocaleString()}`, 50, boxY + 65, {
             continued: true,
             width: 360,
           })
           .fontSize(14)
           .fillColor(data.branding.primaryColor);

        if (data.balance > 0) {
          doc.fontSize(11)
             .fillColor('#000000')
             .text(`Balance: ₦${data.balance.toLocaleString()}`, 50, boxY + 90);
        }

        // Footer
        doc.moveDown(3)
           .fontSize(10)
           .fillColor('#000000')
           .text('_______________________', 300, doc.y + 40)
           .text('Authorized Signature', 305, doc.y + 5);

        doc.fontSize(8)
           .fillColor('#666666')
           .text('This is a computer-generated receipt', 40, doc.y + 30, { align: 'center' });

        doc.end();

        writeStream.on('finish', async () => {
          try {
            const publicUrl = await this.uploadFile(tempPath, fileName, data.tenantId);
            resolve(publicUrl);
          } catch (error) {
            reject(error);
          }
        });

        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Upload file to storage
   */
  private async uploadFile(
    filePath: string,
    fileName: string,
    tenantId: string,
  ): Promise<string> {
    const destination = `${tenantId}/documents/${fileName}`;

    if (this.storage) {
      // Upload to Google Cloud Storage
      await this.storage.bucket(this.bucketName).upload(filePath, {
        destination,
        public: false,
      });

      // Generate signed URL (valid for 7 days)
      const [url] = await this.storage
        .bucket(this.bucketName)
        .file(destination)
        .getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

      // Clean up temp file
      fs.unlinkSync(filePath);

      return url;
    } else {
      // Local storage fallback
      const localDir = path.join(process.cwd(), 'storage', 'documents', tenantId);
      
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      const localPath = path.join(localDir, fileName);
      fs.renameSync(filePath, localPath);

      return `/storage/documents/${tenantId}/${fileName}`;
    }
  }
}
