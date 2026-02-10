import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

@Entity('students')
@Index(['tenant_id', 'admission_number'], { unique: true })
@Index(['tenant_id', 'status'])
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @Column({ length: 50, unique: true })
  admission_number: string;

  @Column({ type: 'uuid', nullable: true })
  current_class_id: string;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100 })
  last_name: string;

  @Column({ length: 100, nullable: true })
  middle_name: string;

  @Column({ type: 'date' })
  date_of_birth: Date;

  @Column({ length: 10 })
  gender: string;

  @Column({ length: 50, nullable: true })
  state_of_origin: string;

  @Column({ length: 100, nullable: true })
  lga: string;

  @Column({ length: 50, default: 'Nigeria' })
  nationality: string;

  @Column({ length: 5, nullable: true })
  blood_group: string;

  @Column({ length: 5, nullable: true })
  genotype: string;

  @Column({ type: 'text', nullable: true })
  medical_conditions: string;

  @Column({ type: 'text', nullable: true })
  photo_url: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  admission_date: Date;

  @Column({ length: 20, default: 'active' })
  status: string; // active, graduated, withdrawn, suspended

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
