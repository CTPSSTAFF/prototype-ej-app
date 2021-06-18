-- Table: public.ctps_sample_taz_demographics_epsg3857

-- DROP TABLE public.ctps_sample_taz_demographics_epsg3857;

CREATE TABLE public.ctps_sample_taz_demographics_epsg3857
(
    objectid integer NOT NULL,
    taz integer,
    total_area numeric(38,8),
    land_area numeric(38,8),
    water_area numeric(38,8),
    total_pop_2010 integer,
    pop_psqmi_2010 numeric(38,8),
    total_pop_u18_2010 integer,
    pop_psqmi_u18_2010 numeric(38,8),
    total_pop_75plus_2010 integer,
    pop_psqmi_75plus_2010 numeric(38,8),
    census_hh_2010 integer,
    hh_psqmi_2010 numeric(38,8),
    total_pop_2016 integer,
    pop_psqmi_2016 numeric(38,8),
    census_hh_2016 integer,
    hh_psqmi_2016 numeric(38,8),
    total_emp_2016 integer,
    emp_psqmi_2016 numeric(38,8),
    total_pop_2040 integer,
    pop_psqmi_2040 numeric(38,8),
    census_hh_2040 integer,
    hh_psqmi_2040 numeric(38,8),
    total_emp_2040 integer,
    emp_psqmi_2040 numeric(38,8),
    pop_psqmi_change_2010_2016 numeric(38,8),
    pop_psqmi_change_2016_2040 numeric(38,8),
    hh_psqmi_change_2010_2016 numeric(38,8),
    hh_psqmi_change_2016_2040 numeric(38,8),
    emp_psqmi_change_2016_2040 numeric(38,8),
    total_emp_2010 integer,
    emp_sqmi_2010 numeric(38,8),
    emp_psqmi_change_2010_2016 numeric(38,8),
    town character varying(30) COLLATE pg_catalog."default",
    town_id integer,
    radial_corr character varying(10) COLLATE pg_catalog."default",
    circumferential_corr character varying(20) COLLATE pg_catalog."default",
    total_minority_pop_2010 integer,
    minority_pop_pct_2010 numeric(38,8),
    minority_taz_2010 character varying(1) COLLATE pg_catalog."default",
    total_lowinc_hh_2010 integer,
    lowinc_hh_pct_2010 numeric(38,8),
    lowinc_taz_2010 character varying(1) COLLATE pg_catalog."default",
    minority_lowinc_taz_2010 character varying(1) COLLATE pg_catalog."default",
    total_pop_5plus_2010 integer,
    total_lep_pop_2010 integer,
    lep_pop_pct_2010 numeric(38,8),
    lep_pop_flag_2010 character varying(1) COLLATE pg_catalog."default",
    pop_75plus_pct_2010 numeric(38,8),
    pop_75plus_flag_2010 character varying(1) COLLATE pg_catalog."default",
    pop_u18_pct_2010 numeric(38,8),
    pop_u18_flag_2010 character varying(1) COLLATE pg_catalog."default",
    total_civ_noninst_pop_2010 integer,
    total_disabled_pop_2010 integer,
    disabled_pop_pct_2010 numeric(38,8),
    disabled_pop_flag_2010 character varying(1) COLLATE pg_catalog."default",
    total_zero_veh_hh_2010 integer,
    zero_veh_hh_pct_2010 numeric(38,8),
    zero_veh_hh_flag_2010 character varying(1) COLLATE pg_catalog."default",
    pop_psqmi_change_2010_2040 numeric(38,8),
    emp_psqmi_change_2010_2040 numeric(38,8),
    hh_psqmi_change_2010_2040 numeric(38,8),
    gdb_geomattr_data bytea,
    shape geometry,
    CONSTRAINT enforce_srid_shape CHECK (st_srid(shape) = 3857)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.ctps_sample_taz_demographics_epsg3857
    OWNER to gisadmin;

GRANT SELECT ON TABLE public.ctps_sample_taz_demographics_epsg3857 TO gispublisher;

GRANT ALL ON TABLE public.ctps_sample_taz_demographics_epsg3857 TO gisadmin;

-- GRANT SELECT ON TABLE public.ctps_sample_taz_demographics_epsg3857 TO sde;
-- Index: a1997_ix1

-- DROP INDEX public.a1997_ix1;

CREATE INDEX a1997_ix1
    ON public.ctps_sample_taz_demographics_epsg3857 USING gist
    (shape)
    TABLESPACE pg_default;
-- Index: r2390_sde_rowid_uk

-- DROP INDEX public.r2390_sde_rowid_uk;

CREATE UNIQUE INDEX r2390_sde_rowid_uk
    ON public.ctps_sample_taz_demographics_epsg3857 USING btree
    (objectid ASC NULLS LAST)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;