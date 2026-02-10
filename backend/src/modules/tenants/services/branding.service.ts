import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantBranding } from '../entities/tenant-branding.entity';

export interface UpdateBrandingDto {
  schoolName?: string;
  schoolLogo?: string;
  dashboardImage?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  subdomain?: string;
  emailFooter?: string;
  whatsappFooter?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);
  private brandingCache: Map<string, TenantBranding> = new Map();

  constructor(
    @InjectRepository(TenantBranding)
    private readonly brandingRepository: Repository<TenantBranding>,
  ) {}

  /**
   * Get tenant branding (with caching)
   */
  async getTenantBranding(tenantId: string): Promise<TenantBranding> {
    // Check cache first
    if (this.brandingCache.has(tenantId)) {
      return this.brandingCache.get(tenantId);
    }

    let branding = await this.brandingRepository.findOne({
      where: { tenantId },
    });

    if (!branding) {
      // Create default branding
      branding = await this.createDefaultBranding(tenantId);
    }

    // Cache the result
    this.brandingCache.set(tenantId, branding);

    return branding;
  }

  /**
   * Create default branding
   */
  private async createDefaultBranding(tenantId: string): Promise<TenantBranding> {
    this.logger.log(`Creating default branding for tenant ${tenantId}`);

    const branding = this.brandingRepository.create({
      tenantId,
      schoolName: 'School Name',
      primaryColor: '#2563eb',
      secondaryColor: '#7c3aed',
    });

    return this.brandingRepository.save(branding);
  }

  /**
   * Update tenant branding
   */
  async updateBranding(tenantId: string, dto: UpdateBrandingDto): Promise<TenantBranding> {
    let branding = await this.brandingRepository.findOne({
      where: { tenantId },
    });

    if (!branding) {
      branding = this.brandingRepository.create({
        tenantId,
        ...dto,
      });
    } else {
      Object.assign(branding, dto);
    }

    const updated = await this.brandingRepository.save(branding);

    // Update cache
    this.brandingCache.set(tenantId, updated);

    this.logger.log(`Branding updated for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Get branding by subdomain
   */
  async getBrandingBySubdomain(subdomain: string): Promise<TenantBranding> {
    const branding = await this.brandingRepository.findOne({
      where: { subdomain },
    });

    if (!branding) {
      throw new NotFoundException('Tenant not found for subdomain');
    }

    return branding;
  }

  /**
   * Get branding by custom domain
   */
  async getBrandingByDomain(domain: string): Promise<TenantBranding> {
    const branding = await this.brandingRepository.findOne({
      where: { customDomain: domain },
    });

    if (!branding) {
      throw new NotFoundException('Tenant not found for domain');
    }

    return branding;
  }

  /**
   * Apply branding to email HTML
   */
  applyEmailBranding(htmlContent: string, branding: TenantBranding): string {
    let branded = htmlContent;

    // Replace color variables
    branded = branded.replace(/\$PRIMARY_COLOR/g, branding.primaryColor);
    branded = branded.replace(/\$SECONDARY_COLOR/g, branding.secondaryColor);
    branded = branded.replace(/\$SCHOOL_NAME/g, branding.schoolName);

    // Add footer if specified
    if (branding.emailFooter) {
      branded += `<div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid ${branding.primaryColor}; font-size: 12px; color: #666;">
        ${branding.emailFooter}
      </div>`;
    }

    return branded;
  }

  /**
   * Apply branding to WhatsApp message
   */
  applyWhatsAppBranding(message: string, branding: TenantBranding): string {
    let branded = message;

    // Add footer if specified
    if (branding.whatsappFooter) {
      branded += `\n\n${branding.whatsappFooter}`;
    } else {
      branded += `\n\n${branding.schoolName}`;
    }

    return branded;
  }

  /**
   * Clear cache for tenant
   */
  clearCache(tenantId: string): void {
    this.brandingCache.delete(tenantId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.brandingCache.clear();
  }
}
